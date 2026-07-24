/** Join conditional class names. Falsy entries are dropped. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/**
 * Collision-resistant id. Prefers `crypto.randomUUID` and degrades gracefully on
 * older or non-secure contexts (file:// previews, some in-app browsers).
 */
export function uid(prefix = ''): string {
  const c = globalThis.crypto;
  let body: string;
  if (c && typeof c.randomUUID === 'function') {
    body = c.randomUUID();
  } else if (c && typeof c.getRandomValues === 'function') {
    const bytes = c.getRandomValues(new Uint8Array(16));
    body = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  } else {
    body = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  }
  return prefix ? `${prefix}_${body}` : body;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Coerce anything a form or a restored JSON blob hands us into a finite number. */
export function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/,/g, '').trim());
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

/** Round half-away-from-zero at `decimals`, avoiding the classic 1.005 float bug. */
export function round(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON * Math.sign(value || 1)) * factor) / factor;
}

export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  wait: number,
): ((...args: A) => void) & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const wrapped = (...args: A) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
  wrapped.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = undefined;
  };
  return wrapped;
}

/** Trigger a browser download for an in-memory blob, then release the URL. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoke on the next frame so Safari has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Strip characters that are illegal in filenames across Windows/macOS/Linux. */
export function safeFilename(input: string, fallback = 'invoice'): string {
  const cleaned = input
    // Drop path separators, reserved characters and control codes.
    .replace(/[\\/:*?"<>|]/g, '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 120);
  return cleaned || fallback;
}

/** True when the value is a plain, non-array object. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
