import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('skeleton', className)} />;
}

/** Placeholder shaped like the invoice sheet, shown while a template loads. */
export function SheetSkeleton() {
  return (
    <div
      role="status"
      aria-label="Preparing the invoice preview"
      className="sheet mx-auto flex w-full flex-col gap-8 rounded-sm p-12"
      style={{ aspectRatio: '210 / 297' }}
    >
      <div className="flex items-start justify-between gap-8">
        <div className="flex-1 space-y-2.5">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-3 w-56" />
          <Skeleton className="h-3 w-44" />
        </div>
        <div className="space-y-2.5 text-right">
          <Skeleton className="ml-auto h-7 w-32" />
          <Skeleton className="ml-auto h-3 w-24" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-2">
          <Skeleton className="h-2.5 w-16" />
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-3 w-28" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-2.5 w-16" />
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>

      <div className="space-y-3">
        <Skeleton className="h-8 w-full" />
        {[0, 1, 2, 3].map((row) => (
          <Skeleton key={row} className="h-5 w-full" />
        ))}
      </div>

      <div className="ml-auto w-1/2 space-y-2.5">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
      <span className="sr-only">Preparing the invoice preview</span>
    </div>
  );
}

/** Placeholder rows for the history drawer. */
export function HistorySkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading saved invoices" className="space-y-2.5">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="rounded-xl bg-surface p-4 ring-1 ring-inset ring-hairline">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="h-5 w-20" />
          </div>
        </div>
      ))}
      <span className="sr-only">Loading saved invoices</span>
    </div>
  );
}
