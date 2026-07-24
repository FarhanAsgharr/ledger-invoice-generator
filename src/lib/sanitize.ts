/**
 * Input hardening.
 *
 * React escapes text nodes, so the realistic injection surface here is narrow
 * and specific: URLs that end up in `href`, images that end up in `src`, and
 * JSON restored from localStorage (which another script on the same origin, or
 * a hand-edited devtools entry, could have tampered with). Each gets a guard.
 */

const SAFE_URL_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:']);

/** Collapse control characters and trim. Applied to every free-text field. */
export function sanitizeText(value: unknown, maxLength = 5000): string {
  if (typeof value !== 'string') return '';
  let out = '';
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    // Keep tab and newline; drop the rest of C0, DEL and the C1 block.
    if (code === 9 || code === 10) {
      out += char;
      continue;
    }
    if (code < 32 || code === 127 || (code >= 128 && code <= 159)) continue;
    out += char;
  }
  return out.slice(0, maxLength);
}

/**
 * Return a URL that is safe to put in `href`, or `null`.
 * Rejects `javascript:`, `data:`, `vbscript:` and anything else exotic.
 */
export function safeUrl(value: string | undefined | null): string | null {
  const raw = sanitizeText(value ?? '', 2048).trim();
  if (!raw) return null;
  // Bare domains ("acme.com") are the common case in a website field.
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(candidate);
    if (!SAFE_URL_SCHEMES.has(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Display form of a website: no scheme, no trailing slash. */
export function displayUrl(value: string | undefined | null): string {
  const url = safeUrl(value);
  if (!url) return '';
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

/** `mailto:` for a plausible address, else null. */
export function safeMailto(value: string | undefined | null): string | null {
  const email = sanitizeText(value ?? '', 320).trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return `mailto:${encodeURIComponent(email).replace(/%40/g, '@')}`;
}

/** `tel:` for a plausible phone number, else null. */
export function safeTel(value: string | undefined | null): string | null {
  const phone = sanitizeText(value ?? '', 40).trim();
  if (!/^[+()\d][\d\s()+.-]{4,}$/.test(phone)) return null;
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'];

/** True only for a base64 data URL of an allowed raster/vector image type. */
export function isSafeImageDataUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = /^data:([a-z0-9.+/-]+);base64,([A-Za-z0-9+/=\s]+)$/i.exec(value);
  if (!match) return false;
  return ALLOWED_IMAGE_TYPES.includes(match[1].toLowerCase());
}

/**
 * SVG can carry scripts, so an uploaded SVG is rasterised to PNG by the cropper
 * before it is ever stored. This guard is the second line of defence: anything
 * that reaches the store must already be a raster data URL.
 */
export function isRasterImageDataUrl(value: unknown): value is string {
  if (!isSafeImageDataUrl(value)) return false;
  return !value.toLowerCase().startsWith('data:image/svg+xml');
}

/** Accept only `#rgb` / `#rrggbb`; fall back to the brand green. */
export function safeHexColor(value: unknown, fallback = '#12A17A'): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed) ? trimmed : fallback;
}
