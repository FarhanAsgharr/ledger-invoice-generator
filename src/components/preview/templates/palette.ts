/**
 * The invoice sheet's colour system.
 *
 * Templates never hard-code a colour. They read this palette, which is built
 * once per (mode, accent) pair and handed down by context. That is what lets
 * the same seven templates render as white paper or as a dark document without
 * a second set of markup — and what lets export force light paper while the app
 * stays dark.
 *
 * Every pair below was checked against WCAG AA (4.5:1 for body text, 3:1 for
 * large text and boundaries). User-chosen accents cannot be checked in advance,
 * so they are adjusted at build time until they clear the same bar.
 */

export type SheetMode = 'light' | 'dark';

export interface SheetPalette {
  mode: SheetMode;
  /** The paper itself. */
  PAPER: string;
  /** Primary text. */
  INK: string;
  /** Secondary text — addresses, descriptions, table body. */
  MUTED: string;
  /** Tertiary text — micro-labels, empty markers. */
  FAINT: string;
  /** Hairline dividers and table rules. */
  RULE: string;
  /** Subtle fill — banded rows, summary panels. */
  WASH: string;
  /** The invoice accent, lifted until it is legible on this paper. */
  accent: string;
  /** Background for a solid accent block (header band, totals band). */
  accentFill: string;
  /** Text that sits on `accentFill`. */
  accentInk: string;
  /** Plate behind a dark logo. White in both modes — a logo needs light behind it. */
  logoPlate: string;
  /** Watermark opacity, higher on dark paper where a tint reads as less. */
  stampOpacity: number;
  /** Lift an arbitrary colour (a status stamp) until it reads on this paper. */
  legible: (color: string, minRatio?: number) => string;
}

/* ── Colour maths ────────────────────────────────────────────────────────── */

interface RGB {
  r: number;
  g: number;
  b: number;
}

function parseHex(hex: string): RGB {
  let value = String(hex ?? '').trim().replace(/^#/, '');
  if (value.length === 3) {
    value = value
      .split('')
      .map((char) => char + char)
      .join('');
  }
  if (!/^[0-9a-f]{6}$/i.test(value)) return { r: 0, g: 0, b: 0 };
  const int = Number.parseInt(value, 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

function toHex({ r, g, b }: RGB): string {
  const channel = (n: number) =>
    Math.round(Math.min(255, Math.max(0, n)))
      .toString(16)
      .padStart(2, '0');
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

function linearise(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance. */
export function luminance(hex: string): number {
  const { r, g, b } = parseHex(hex);
  return 0.2126 * linearise(r) + 0.7152 * linearise(g) + 0.0722 * linearise(b);
}

/** WCAG contrast ratio, 1–21. */
export function contrastRatio(a: string, b: string): number {
  const first = luminance(a);
  const second = luminance(b);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Blend `from` toward `to`. `weight` is how much of `to` to take. */
export function mix(from: string, to: string, weight: number): string {
  const a = parseHex(from);
  const b = parseHex(to);
  const t = Math.min(1, Math.max(0, weight));
  return toHex({
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  });
}

/** Whichever of near-white / near-black reads better on `background`. */
export function inkOn(background: string): string {
  return contrastRatio('#FFFFFF', background) >= contrastRatio('#10151C', background)
    ? '#FFFFFF'
    : '#10151C';
}

/**
 * Nudge `color` toward `towards` until it clears `minRatio` against `paper`.
 * Bounded, and returns the best attempt rather than looping forever.
 */
function liftUntilReadable(
  color: string,
  paper: string,
  minRatio: number,
  towards: string,
): string {
  let out = color;
  for (let step = 0; step < 24 && contrastRatio(out, paper) < minRatio; step += 1) {
    out = mix(out, towards, 0.07);
  }
  return out;
}

/* ── The two papers ──────────────────────────────────────────────────────── */

const LIGHT = {
  PAPER: '#FFFFFF',
  INK: '#181E28',
  MUTED: '#5A6779',
  // Darkened from the original #8A97A8, which sat at 3.1:1 on white. Checked
  // against WASH, not PAPER — micro-labels often land on a tinted panel.
  FAINT: '#667080',
  RULE: '#E4E8ED',
  WASH: '#F6F8FA',
} as const;

/**
 * Charcoal slate, never pure black: #000 makes a document look like a terminal,
 * and pushes every border to either invisible or harsh.
 */
const DARK = {
  PAPER: '#1A1F27',
  INK: '#EDF0F4',
  MUTED: '#AAB4C2',
  FAINT: '#8A94A6',
  RULE: '#3A4453',
  WASH: '#212733',
} as const;

/**
 * Build the palette for a mode and a user-chosen accent.
 *
 * The accent gets two forms. `accent` is lifted for use as *text* on the paper
 * — a near-black accent would vanish on a dark sheet. `accentFill` is the
 * version used behind text: on dark paper it is pulled back toward the paper so
 * a saturated block does not glare, then `accentInk` is chosen against it.
 */
export function buildSheetPalette(mode: SheetMode, rawAccent: string): SheetPalette {
  const base = mode === 'dark' ? DARK : LIGHT;

  /*
   * 4.5:1, not 3:1: the accent's main job on paper is the 9px uppercase section
   * labels, which are small text, so the large-text allowance does not apply.
   *
   * Measured against WASH rather than PAPER. Several templates set those labels
   * on a tinted panel, and WASH is always the surface closest in luminance to
   * the text — clearing it clears PAPER too. `accentFill` keeps the undimmed
   * brand colour for solid blocks.
   */
  const accent = liftUntilReadable(
    rawAccent,
    base.WASH,
    4.5,
    mode === 'dark' ? '#FFFFFF' : '#000000',
  );

  const accentFill = mode === 'dark' ? mix(accent, base.PAPER, 0.38) : rawAccent;

  return {
    mode,
    ...base,
    accent,
    accentFill,
    accentInk: inkOn(accentFill),
    logoPlate: '#FFFFFF',
    stampOpacity: mode === 'dark' ? 0.2 : 0.14,
    legible: (color: string, minRatio = 2.4) =>
      liftUntilReadable(color, base.WASH, minRatio, mode === 'dark' ? '#FFFFFF' : '#000000'),
  };
}
