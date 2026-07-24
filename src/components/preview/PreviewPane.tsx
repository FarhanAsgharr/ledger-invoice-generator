import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Maximize, Minus, Plus } from 'lucide-react';
import { Tooltip } from '@/components/ui/Tooltip';
import { InvoiceSheet } from '@/components/preview/InvoiceSheet';
import { TemplateRail } from '@/components/preview/TemplateRail';
import { A4_HEIGHT_PX, A4_WIDTH_PX } from '@/lib/pdf';
import { clamp, cn } from '@/lib/utils';
import type { Invoice, TemplateId } from '@/types';

interface PreviewPaneProps {
  invoice: Invoice;
  onTemplateChange: (id: TemplateId) => void;
  onAccentChange: (hex: string) => void;
  className?: string;
}

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 1.6;

/**
 * The desk: a scaled, live view of the paper.
 *
 * The sheet always lays out at exactly 794 px (A4 at 96 dpi) and is scaled with
 * a transform to fit whatever space is available. That way the preview, the
 * print output and the PDF are the same document at different magnifications —
 * there is no separate "print layout" to keep in sync.
 */
export function PreviewPane({
  invoice,
  onTemplateChange,
  onAccentChange,
  className,
}: PreviewPaneProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [sheetHeight, setSheetHeight] = useState(A4_HEIGHT_PX);

  const scale = clamp(fitScale * zoom, MIN_ZOOM * fitScale, MAX_ZOOM);

  /* Recompute the fit scale whenever the available width changes. */
  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return undefined;

    const measure = () => {
      const available = frame.clientWidth;
      if (available > 0) setFitScale(Math.min(1, available / A4_WIDTH_PX));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  /* Track the sheet's natural height so the scaled wrapper reserves the right space. */
  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return undefined;

    const measure = () => setSheetHeight(sheet.scrollHeight || A4_HEIGHT_PX);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(sheet);
    return () => observer.disconnect();
  }, [invoice]);

  const resetZoom = useCallback(() => setZoom(1), []);

  const pageCount = Math.max(1, Math.ceil(sheetHeight / A4_HEIGHT_PX));

  return (
    <div data-print-path className={cn('flex min-w-0 flex-col gap-4', className)}>
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <h2 className="text-sm font-bold tracking-[-0.01em] text-fg">Preview</h2>
          <span className="font-mono text-2xs text-faint">
            A4 · {pageCount} {pageCount === 1 ? 'page' : 'pages'}
          </span>
        </div>

        <div className="flex items-center gap-1 rounded-xl bg-surface p-1 ring-1 ring-inset ring-hairline">
          <Tooltip label="Zoom out">
            <button
              type="button"
              onClick={() => setZoom((z) => clamp(z - 0.1, MIN_ZOOM, MAX_ZOOM))}
              aria-label="Zoom out"
              className="rounded-lg p-1.5 text-muted transition-colors hover:bg-sunken hover:text-fg"
            >
              <Minus aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
          <button
            type="button"
            onClick={resetZoom}
            className="min-w-[3.25rem] rounded-lg px-1.5 py-1 font-mono text-2xs font-semibold text-muted transition-colors hover:bg-sunken hover:text-fg"
            aria-label={`Zoom level ${Math.round(scale * 100)} percent. Activate to fit the page.`}
          >
            {Math.round(scale * 100)}%
          </button>
          <Tooltip label="Zoom in">
            <button
              type="button"
              onClick={() => setZoom((z) => clamp(z + 0.1, MIN_ZOOM, MAX_ZOOM))}
              aria-label="Zoom in"
              className="rounded-lg p-1.5 text-muted transition-colors hover:bg-sunken hover:text-fg"
            >
              <Plus aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
          <Tooltip label="Fit to width">
            <button
              type="button"
              onClick={resetZoom}
              aria-label="Fit the invoice to the available width"
              className="rounded-lg p-1.5 text-muted transition-colors hover:bg-sunken hover:text-fg"
            >
              <Maximize aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
        </div>
      </div>

      <div ref={frameRef} data-print-path className="min-w-0">
        {/* Reserve the scaled footprint so the page does not jump as content grows. */}
        <div
          data-print-path
          className="relative mx-auto overflow-hidden"
          style={{ width: A4_WIDTH_PX * scale, height: sheetHeight * scale }}
        >
          <div
            id="print-root"
            style={{
              width: A4_WIDTH_PX,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
          >
            <div ref={sheetRef}>
              <InvoiceSheet invoice={invoice} />
            </div>
          </div>
        </div>
      </div>

      <TemplateRail
        value={invoice.template}
        onChange={onTemplateChange}
        accent={invoice.accent}
        onAccentChange={onAccentChange}
      />
    </div>
  );
}
