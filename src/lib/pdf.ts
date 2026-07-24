import { safeFilename } from '@/lib/utils';

/**
 * PDF and image export.
 *
 * `html2canvas` and `jspdf` together weigh more than the rest of the app, so
 * they are imported dynamically the first time someone exports. Until then they
 * are never fetched.
 *
 * ── Why this file is defensive ──────────────────────────────────────────────
 *
 * jsPDF's `addImage` funnels every coordinate through an internal `scale()`
 * that throws `Invalid argument passed to jsPDF.scale` on a non-numeric value.
 * A zero-size canvas turns the page arithmetic into `0 / 0`, so one bad
 * measurement upstream surfaces as that opaque message rather than as the
 * layout problem it actually is.
 *
 * The historical cause was passing `windowWidth: 794` to html2canvas: the
 * cloned iframe then rendered at 794 px, Tailwind's `lg:` breakpoint stopped
 * matching inside it, and the preview column — classed `hidden lg:block` —
 * became `display: none` in the clone. The live element was visible, the cloned
 * one was not, and the canvas came back 0 x 0.
 *
 * Three things now prevent a repeat:
 *   1. The clone's viewport is left alone, so its media queries match the live
 *      page exactly.
 *   2. `prepareClone` force-shows the whole ancestor chain regardless.
 *   3. Every number is validated at the boundary, so a future layout bug fails
 *      with a sentence a person can act on instead of a jsPDF internal.
 */

/** A4 at 96 dpi, in CSS pixels. */
export const A4_WIDTH_PX = 794;
export const A4_HEIGHT_PX = 1123;

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

/** Rasterisation multiplier bounds. Below 1 is blurry; above 2 is mostly heat. */
const MIN_SCALE = 1;
const MAX_SCALE = 2;

/** A runaway page count would hang the tab; no real invoice comes near this. */
const MAX_PAGES = 80;

/** rAF never fires in a background tab, so every wait has a way out. */
const FRAME_TIMEOUT_MS = 250;
const FONT_TIMEOUT_MS = 3000;

export type ExportStage = 'waiting' | 'measuring' | 'rendering' | 'assembling' | 'saving';

export interface ExportOptions {
  /** Base name; the extension is appended. */
  filename: string;
  /** Preferred rasterisation multiplier. Clamped to [1, 2]; invalid values fall
   *  back to the device pixel ratio. */
  scale?: number;
  onProgress?: (stage: ExportStage) => void;
}

/**
 * An export failure with a message written for the person who clicked the
 * button. Anything thrown from here is safe to show in a toast.
 */
export class ExportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExportError';
  }
}

/* ── Numeric guards ──────────────────────────────────────────────────────── */

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Gate for every value that reaches jsPDF or html2canvas. Rejects `undefined`,
 * `null`, `NaN`, `Infinity` and non-positive numbers.
 */
function requirePositive(label: string, value: unknown): number {
  if (!isFiniteNumber(value) || value <= 0) {
    throw new ExportError(
      `${label} came back as ${String(value)}, so the invoice could not be measured. ` +
        'Make sure the preview is visible, then try again.',
    );
  }
  return value;
}

/**
 * Resolve the capture scale. Always returns a finite number in [1, 2],
 * whatever the caller or the browser hands over.
 */
export function resolveScale(preferred?: number): number {
  const candidate = isFiniteNumber(preferred) ? preferred : window.devicePixelRatio;
  const base = isFiniteNumber(candidate) && candidate > 0 ? candidate : 1;
  return Math.max(MIN_SCALE, Math.min(MAX_SCALE, base));
}

/* ── Waiting for a settled layout ────────────────────────────────────────── */

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** One animation frame, with a timeout so a throttled tab cannot hang the export. */
function nextFrame(): Promise<void> {
  return Promise.race([
    new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    }),
    delay(FRAME_TIMEOUT_MS),
  ]);
}

/**
 * Block until the sheet is actually painted:
 *
 *  - webfonts resolved, so html2canvas measures the real metrics rather than
 *    the fallback face (this is what makes text reflow between preview and PDF)
 *  - two animation frames, so React's commit and the browser's subsequent
 *    layout and paint have both landed
 *
 * Both waits are capped. A slow font CDN delays the export; it never blocks it.
 */
export async function waitForRenderedLayout(): Promise<void> {
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    await Promise.race([
      document.fonts.ready.then(() => undefined).catch(() => undefined),
      delay(FONT_TIMEOUT_MS),
    ]);
  }
  await nextFrame();
  await nextFrame();
}

/* ── Finding and measuring the sheet ─────────────────────────────────────── */

export const SHEET_ELEMENT_ID = 'print-root';

/** Look up the sheet, or fail with something a person can act on. */
export function getSheetElement(id: string = SHEET_ELEMENT_ID): HTMLElement {
  const element = document.getElementById(id);
  if (!element) {
    throw new ExportError(
      'The invoice preview is not on screen, so there was nothing to export. ' +
        'Switch to the Preview tab and try again.',
    );
  }
  return element;
}

export interface SheetMetrics {
  /** On-screen box, after the preview's display transform. */
  rectWidth: number;
  rectHeight: number;
  /** Untransformed layout size — what actually gets rasterised. */
  layoutWidth: number;
  layoutHeight: number;
}

/**
 * Measure the sheet.
 *
 * `offsetWidth` and `scrollHeight` ignore CSS transforms, so they report the
 * sheet's true 794 px layout regardless of the preview's zoom.
 * `getBoundingClientRect` does honour the transform, which makes it the right
 * check for "is this element actually rendered": a hidden or collapsed element
 * returns zeros.
 */
export function measureSheet(element: HTMLElement): SheetMetrics {
  const rect = element.getBoundingClientRect();
  const metrics: SheetMetrics = {
    rectWidth: rect.width,
    rectHeight: rect.height,
    layoutWidth: element.offsetWidth,
    layoutHeight: Math.max(element.scrollHeight, element.offsetHeight),
  };

  if (!isFiniteNumber(rect.width) || !isFiniteNumber(rect.height) || rect.width <= 0 || rect.height <= 0) {
    throw new ExportError(
      'The invoice preview is hidden, so it could not be captured. ' +
        'Open the Preview tab and try again.',
    );
  }

  requirePositive('The preview width', metrics.layoutWidth);
  requirePositive('The preview height', metrics.layoutHeight);

  return metrics;
}

/* ── Paper colour ────────────────────────────────────────────────────────── */

/** Opaque white, as a fallback and as the value every guard degrades to. */
const WHITE: RGB = { r: 255, g: 255, b: 255 };

export interface RGB {
  r: number;
  g: number;
  b: number;
}

function parseRgb(value: string): RGB | null {
  const match = /^rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?/i.exec(value.trim());
  if (!match) return null;
  // A transparent colour tells us nothing about what the page should be.
  if (match[4] !== undefined && Number(match[4]) < 0.99) return null;
  return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]) };
}

/**
 * The colour of the paper being exported.
 *
 * Read from the DOM rather than passed in, so the export cannot disagree with
 * what is on screen: whatever the template painted is what the PDF gets. The
 * template root carries it — `.sheet` itself is a frame, and its own background
 * is the same in both themes.
 *
 * Every fallback is white, because a wrong-but-white page is legible and a
 * wrong-but-dark one is not.
 */
export function readPaperColour(element: HTMLElement): RGB {
  const sheet = element.classList.contains('sheet')
    ? element
    : element.querySelector<HTMLElement>('.sheet');
  const candidates = [sheet?.firstElementChild, sheet, element].filter(
    (node): node is HTMLElement => node instanceof HTMLElement,
  );

  for (const node of candidates) {
    const parsed = parseRgb(getComputedStyle(node).backgroundColor);
    if (parsed) return parsed;
  }
  return WHITE;
}

function toCssRgb({ r, g, b }: RGB): string {
  return `rgb(${r}, ${g}, ${b})`;
}

/* ── Cloning ─────────────────────────────────────────────────────────────── */

const FORCE_VISIBLE: Array<[string, string]> = [
  ['display', 'block'],
  ['visibility', 'visible'],
  ['opacity', '1'],
  ['position', 'static'],
  ['overflow', 'visible'],
  ['transform', 'none'],
  ['width', 'auto'],
  ['max-width', 'none'],
  ['height', 'auto'],
  ['max-height', 'none'],
  ['margin', '0'],
];

/**
 * Prepare html2canvas's cloned document.
 *
 * The sheet sits inside a scaled, clipped, breakpoint-dependent wrapper. Every
 * ancestor is force-shown and un-transformed here so the clone cannot collapse
 * the element to zero size — the failure that produced the jsPDF error.
 */
function prepareClone(doc: Document): void {
  const root = doc.getElementById(SHEET_ELEMENT_ID);
  if (!root) return;

  for (let node = root.parentElement; node && node !== doc.body; node = node.parentElement) {
    FORCE_VISIBLE.forEach(([property, value]) => node?.style.setProperty(property, value, 'important'));
  }

  root.style.setProperty('display', 'block', 'important');
  root.style.setProperty('visibility', 'visible', 'important');
  root.style.setProperty('opacity', '1', 'important');
  root.style.setProperty('position', 'static', 'important');
  root.style.setProperty('overflow', 'visible', 'important');
  root.style.setProperty('transform', 'none', 'important');
  root.style.setProperty('width', `${A4_WIDTH_PX}px`, 'important');
  root.style.setProperty('margin', '0', 'important');

  // Freeze animations so a capture never catches an element mid-transition.
  // Transforms *inside* the sheet are left alone — the status watermark's
  // rotation is part of the document, not a transition.
  root.querySelectorAll<HTMLElement>('*').forEach((el) => {
    el.style.animation = 'none';
    el.style.transition = 'none';
  });

  root.querySelectorAll<HTMLElement>('.no-print').forEach((el) => {
    el.style.setProperty('display', 'none', 'important');
  });
}

/* ── Rasterising ─────────────────────────────────────────────────────────── */

interface RasterResult {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

/**
 * Render the sheet to a canvas.
 *
 * Note what is *not* passed: `width`, `windowWidth`, `scrollX` and `scrollY`.
 * Overriding the clone's viewport is what broke media queries inside it. The
 * sheet carries an explicit 794 px width of its own, so the capture is already
 * independent of the real viewport.
 */
async function rasterise(element: HTMLElement, scale: number, paper: RGB): Promise<RasterResult> {
  const { default: html2canvas } = await import('html2canvas');

  const canvas = await html2canvas(element, {
    scale,
    // The canvas base must be the paper, not white. On a dark sheet a white
    // base shows through anywhere the template does not paint.
    backgroundColor: toCssRgb(paper),
    useCORS: true,
    allowTaint: false,
    logging: false,
    imageTimeout: 15_000,
    removeContainer: true,
    onclone: prepareClone,
  });

  return {
    canvas,
    width: requirePositive('The rendered canvas width', canvas.width),
    height: requirePositive('The rendered canvas height', canvas.height),
  };
}

/** Copy a horizontal band out of the source canvas onto a page-sized canvas. */
function sliceCanvas(
  source: HTMLCanvasElement,
  offsetY: number,
  sliceHeight: number,
  paper: RGB,
): HTMLCanvasElement {
  const slice = document.createElement('canvas');
  slice.width = source.width;
  slice.height = sliceHeight;

  const ctx = slice.getContext('2d');
  if (!ctx) {
    throw new ExportError('This browser would not provide a drawing surface for the export.');
  }
  ctx.fillStyle = toCssRgb(paper);
  ctx.fillRect(0, 0, slice.width, slice.height);
  ctx.drawImage(source, 0, offsetY, source.width, sliceHeight, 0, 0, source.width, sliceHeight);
  return slice;
}

function toJpegDataUrl(canvas: HTMLCanvasElement): string {
  const dataUrl = canvas.toDataURL('image/jpeg', 0.96);
  if (!dataUrl.startsWith('data:image/')) {
    throw new ExportError('The browser could not encode the invoice as an image.');
  }
  return dataUrl;
}

/* ── Diagnostics ─────────────────────────────────────────────────────────── */

/**
 * One structured line per export. Cheap, and it turns "the PDF failed" into a
 * report with the three numbers that matter.
 */
function logExport(stage: string, detail: Record<string, unknown>): void {
  console.info(`[Ledger] PDF export · ${stage}`, detail);
}

/* ── Public API ──────────────────────────────────────────────────────────── */

/**
 * Render `element` to a multi-page A4 PDF and download it.
 * Content taller than one page is split at exact A4 boundaries.
 */
export async function exportElementToPdf(
  element: HTMLElement | null,
  { filename, scale, onProgress }: ExportOptions,
): Promise<void> {
  if (!element) {
    throw new ExportError(
      'The invoice preview is not on screen, so there was nothing to export. ' +
        'Switch to the Preview tab and try again.',
    );
  }

  const chosenScale = resolveScale(scale);

  onProgress?.('waiting');
  await waitForRenderedLayout();

  onProgress?.('measuring');
  const metrics = measureSheet(element);
  // Whatever the template is painting right now — light or dark. The export
  // never overrides it; it copies it.
  const paper = readPaperColour(element);

  onProgress?.('rendering');
  const { canvas, width: canvasWidth, height: canvasHeight } = await rasterise(
    element,
    chosenScale,
    paper,
  );

  logExport('captured', {
    elementWidth: metrics.layoutWidth,
    elementHeight: metrics.layoutHeight,
    onScreenWidth: Math.round(metrics.rectWidth),
    onScreenHeight: Math.round(metrics.rectHeight),
    canvasWidth,
    canvasHeight,
    scale: chosenScale,
    devicePixelRatio: window.devicePixelRatio,
    paper: `rgb(${paper.r}, ${paper.g}, ${paper.b})`,
    sheetMode: element.querySelector('.sheet')?.getAttribute('data-sheet-mode') ?? 'unknown',
  });

  onProgress?.('assembling');
  const { default: JsPDF } = await import('jspdf');
  const pdf = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });

  // Every subsequent figure derives from these two, and both are already
  // guaranteed finite and positive — so nothing downstream can become NaN.
  const mmPerPx = requirePositive('The page scale', A4_WIDTH_MM / canvasWidth);
  const fullHeightMM = requirePositive('The invoice height', canvasHeight * mmPerPx);

  /*
   * Paint the page before placing the image.
   *
   * A PDF page defaults to white, and the last page's image is almost always
   * shorter than A4 — which on a dark sheet left a white strip along the bottom.
   * Filling first means the page matches the paper edge to edge.
   */
  const place = (dataUrl: string, heightMM: number) => {
    const safeHeight = Math.min(requirePositive('A page height', heightMM), A4_HEIGHT_MM);
    pdf.setFillColor(paper.r, paper.g, paper.b);
    pdf.rect(0, 0, A4_WIDTH_MM, A4_HEIGHT_MM, 'F');
    pdf.addImage(dataUrl, 'JPEG', 0, 0, A4_WIDTH_MM, safeHeight, undefined, 'FAST');
  };

  let pageCount = 1;

  // Half a millimetre of tolerance: a sheet authored at exactly A4 rounds a
  // hair over, and an empty second page is worse than a hair of clipping.
  if (fullHeightMM <= A4_HEIGHT_MM + 0.5) {
    place(toJpegDataUrl(canvas), fullHeightMM);
  } else {
    const pxPerPage = Math.max(1, Math.floor(A4_HEIGHT_MM / mmPerPx));
    pageCount = Math.min(MAX_PAGES, Math.max(1, Math.ceil(canvasHeight / pxPerPage)));

    for (let page = 0; page < pageCount; page += 1) {
      const offsetY = page * pxPerPage;
      const sliceHeight = Math.min(pxPerPage, canvasHeight - offsetY);
      if (sliceHeight <= 0) break;

      if (page > 0) pdf.addPage();
      place(toJpegDataUrl(sliceCanvas(canvas, offsetY, sliceHeight, paper)), sliceHeight * mmPerPx);
    }
  }

  pdf.setProperties({ title: filename, subject: 'Invoice', creator: 'Ledger' });

  logExport('assembled', { pages: pageCount, heightMM: Math.round(fullHeightMM) });

  onProgress?.('saving');
  pdf.save(`${safeFilename(filename)}.pdf`);
}

/** Rasterise the sheet to a PNG blob — used by "Save as image". */
export async function exportElementToPng(
  element: HTMLElement | null,
  scale?: number,
): Promise<Blob> {
  if (!element) {
    throw new ExportError(
      'The invoice preview is not on screen, so there was nothing to export. ' +
        'Switch to the Preview tab and try again.',
    );
  }

  const chosenScale = resolveScale(scale);
  await waitForRenderedLayout();
  const metrics = measureSheet(element);
  const paper = readPaperColour(element);
  const { canvas, width, height } = await rasterise(element, chosenScale, paper);

  logExport('captured (png)', {
    elementWidth: metrics.layoutWidth,
    elementHeight: metrics.layoutHeight,
    canvasWidth: width,
    canvasHeight: height,
    scale: chosenScale,
    paper: `rgb(${paper.r}, ${paper.g}, ${paper.b})`,
  });

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new ExportError('The browser could not encode the invoice as an image.'));
    }, 'image/png');
  });
}
