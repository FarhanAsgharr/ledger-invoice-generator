import { Suspense, lazy, memo, useMemo } from 'react';
import type { ComponentType, LazyExoticComponent } from 'react';
import { SheetSkeleton } from '@/components/ui/Skeleton';
import { SheetThemeProvider } from '@/components/preview/templates/SheetTheme';
import { usePaper } from '@/context/PaperContext';
import { cn } from '@/lib/utils';
import { calculateTotals } from '@/lib/calc';
import type { Invoice, InvoiceTotals, TemplateId } from '@/types';

type TemplateComponent = ComponentType<{ invoice: Invoice; totals: InvoiceTotals }>;

/** Every template as a dynamic import, declared once and reused for prefetching. */
const LOADERS: Record<TemplateId, () => Promise<{ default: TemplateComponent }>> = {
  modern: () => import('./templates/ModernTemplate').then((m) => ({ default: m.ModernTemplate })),
  minimal: () => import('./templates/MinimalTemplate').then((m) => ({ default: m.MinimalTemplate })),
  corporate: () =>
    import('./templates/CorporateTemplate').then((m) => ({ default: m.CorporateTemplate })),
  elegant: () => import('./templates/ElegantTemplate').then((m) => ({ default: m.ElegantTemplate })),
  classic: () => import('./templates/ClassicTemplate').then((m) => ({ default: m.ClassicTemplate })),
  professional: () =>
    import('./templates/ProfessionalTemplate').then((m) => ({ default: m.ProfessionalTemplate })),
  creative: () =>
    import('./templates/CreativeTemplate').then((m) => ({ default: m.CreativeTemplate })),
};

/**
 * Templates are code-split: only the one on screen is ever downloaded.
 * Switching shows the sheet skeleton while the new chunk arrives, so the layout
 * never collapses mid-swap.
 */
const REGISTRY = Object.fromEntries(
  (Object.keys(LOADERS) as TemplateId[]).map((id) => [id, lazy(LOADERS[id])]),
) as Record<TemplateId, LazyExoticComponent<TemplateComponent>>;

/**
 * Warm a template's chunk before it is needed — called on hover in the template
 * rail. The module registry dedupes, so repeat calls are free.
 */
export function prefetchTemplate(id: TemplateId): void {
  void LOADERS[id]?.();
}

interface InvoiceSheetProps {
  invoice: Invoice;
}

/** Renders the paper: one template, one set of totals, no chrome. */
export const InvoiceSheet = memo(function InvoiceSheet({ invoice }: InvoiceSheetProps) {
  const totals = useMemo(() => calculateTotals(invoice), [invoice]);
  const Template = REGISTRY[invoice.template] ?? REGISTRY.modern;
  const { mode, instant } = usePaper();

  return (
    <article
      // `sheet-themed` cross-fades the paper's colours. It is dropped while an
      // export forces a mode, so a capture never lands mid-transition.
      className={cn('sheet', !instant && 'sheet-themed')}
      data-sheet-mode={mode}
      aria-label={`Invoice ${invoice.number} preview`}
      style={{ width: '794px' }}
    >
      <SheetThemeProvider mode={mode} accent={invoice.accent}>
        <Suspense fallback={<SheetSkeleton />}>
          <Template invoice={invoice} totals={totals} />
        </Suspense>
      </SheetThemeProvider>
    </article>
  );
});
