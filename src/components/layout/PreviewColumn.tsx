import { useMemo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { TotalsLadder } from '@/components/invoice/TotalsLadder';
import { PreviewPane } from '@/components/preview/PreviewPane';
import { calculateTotals } from '@/lib/calc';
import { safeHexColor } from '@/lib/sanitize';
import type { Invoice, TemplateId } from '@/types';

/**
 * The live half of the workspace.
 *
 * Isolated in its own component on purpose: it subscribes to *every* field, so
 * it re-renders on each keystroke. Keeping that subscription out of the parent
 * means the navbar, the drawers and the form sections do not.
 */
export function PreviewColumn({ fallback }: { fallback: Invoice }) {
  const { control, setValue } = useFormContext<Invoice>();
  const watched = useWatch({ control, defaultValue: fallback }) as Invoice;

  // `useWatch` can emit before the field array registers; fall back to the last
  // known-good invoice so the sheet never renders half a document.
  const invoice = useMemo<Invoice>(
    () => ({
      ...fallback,
      ...watched,
      accent: safeHexColor(watched?.accent, fallback.accent),
      items: watched?.items?.length ? watched.items : fallback.items,
      taxes: watched?.taxes ?? [],
      additionalCharges: watched?.additionalCharges ?? [],
    }),
    [watched, fallback],
  );

  const totals = useMemo(() => calculateTotals(invoice), [invoice]);

  return (
    <div data-print-path className="flex flex-col gap-5">
      <TotalsLadder
        totals={totals}
        currencyCode={invoice.currencyCode}
        className="no-print lg:hidden"
      />

      <PreviewPane
        invoice={invoice}
        onTemplateChange={(id: TemplateId) => setValue('template', id, { shouldDirty: true })}
        onAccentChange={(hex) => setValue('accent', safeHexColor(hex), { shouldDirty: true })}
      />
    </div>
  );
}

/** The same totals, pinned beside the form on wide screens. */
export function TotalsSidecar({ fallback }: { fallback: Invoice }) {
  const { control } = useFormContext<Invoice>();
  const watched = useWatch({ control, defaultValue: fallback }) as Invoice;

  const totals = useMemo(
    () => calculateTotals({ ...fallback, ...watched, items: watched?.items ?? fallback.items }),
    [watched, fallback],
  );

  return (
    <TotalsLadder
      totals={totals}
      currencyCode={watched?.currencyCode ?? fallback.currencyCode}
      className="no-print"
    />
  );
}
