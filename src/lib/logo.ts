/**
 * Logo diagnostics.
 *
 * A logo that will not render is the one failure a user cannot debug from the
 * screen — every outcome looks like "nothing there". So every load and every
 * failure is reported to the console with the src, the decoded size and, when
 * it fails, a specific reason rather than a generic error.
 */

/** Data URL types a stored logo is allowed to be. SVG is rasterised on upload. */
const SUPPORTED = /^data:image\/(png|jpeg|jpg|webp|gif);base64,/i;

/** Short, non-spammy description of a src — never dumps a 400 KB data URL. */
export function describeLogoSrc(src: string | null | undefined): string {
  if (!src) return '(no src)';
  if (src.startsWith('data:')) {
    const header = src.slice(0, src.indexOf(',') + 1);
    return `${header}… ${Math.round(src.length / 1024)} KB`;
  }
  return src.length > 64 ? `${src.slice(0, 64)}…` : src;
}

/**
 * Why a logo did not render, in a sentence that points at the cause.
 * Returned to the console, never rendered into the invoice.
 */
export function explainLogoFailure(src: string | null | undefined): string {
  if (!src) {
    return 'The image element had no src. The logo was probably cleared while it was rendering.';
  }
  if (src.startsWith('blob:')) {
    return (
      'The src is a blob: URL. Those stop resolving once revoked or once the page reloads, ' +
      'so a logo must be stored as a base64 data: URL instead.'
    );
  }
  if (src.startsWith('http://') || src.startsWith('https://')) {
    return (
      'The src is a remote URL. Remote images taint the export canvas and cannot be embedded ' +
      'in the PDF, so only local data: URLs are stored.'
    );
  }
  if (!src.startsWith('data:')) {
    return `The src is not a data: URL (starts with "${src.slice(0, 12)}").`;
  }
  if (!SUPPORTED.test(src)) {
    return (
      'The data URL does not declare a supported raster type. Expected image/png, image/jpeg, ' +
      'image/webp or image/gif — SVG is rasterised to PNG when it is uploaded.'
    );
  }
  return 'The data URL is well-formed but the browser could not decode it. The image data is likely truncated — check whether localStorage ran out of room while saving.';
}

/** Called from an `onLoad` handler. One line, with the numbers that matter. */
export function logLogoLoaded(where: string, image: HTMLImageElement): void {
  const rect = image.getBoundingClientRect();
  console.info(`[Ledger] logo rendered · ${where}`, {
    src: describeLogoSrc(image.currentSrc || image.src),
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight,
    renderedWidth: Math.round(rect.width),
    renderedHeight: Math.round(rect.height),
    complete: image.complete,
  });
}

/** Called from an `onError` handler. Says why, so nobody has to guess. */
export function logLogoFailed(where: string, src: string | null | undefined): void {
  console.error(`[Ledger] logo failed to render · ${where}`, {
    src: describeLogoSrc(src),
    reason: explainLogoFailure(src),
  });
}
