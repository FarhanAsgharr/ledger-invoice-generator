import { AnimatedMoney } from '@/components/ui/AnimatedNumber';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { InvoiceTotals } from '@/types';

interface TotalsLadderProps {
  totals: InvoiceTotals;
  currencyCode: string;
  className?: string;
}

interface RungProps {
  label: string;
  value: string;
  muted?: boolean;
  negative?: boolean;
}

function Rung({ label, value, muted, negative }: RungProps) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className={cn('text-[0.8125rem]', muted ? 'text-faint' : 'text-muted')}>{label}</dt>
      <dd
        className={cn(
          'font-mono text-[0.8125rem] tabular',
          negative ? 'text-brand-600 dark:text-brand-300' : 'text-fg',
        )}
      >
        {negative ? `− ${value}` : value}
      </dd>
    </div>
  );
}

/**
 * The running total, mirrored from the sheet into the editor so you never have
 * to look away from the form to see what the invoice comes to.
 */
export function TotalsLadder({ totals, currencyCode, className }: TotalsLadderProps) {
  const money = (amount: number) => formatMoney(amount, currencyCode);

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl bg-surface shadow-card ring-1 ring-hairline',
        className,
      )}
    >
      <dl className="px-4 pt-3 sm:px-5">
        <Rung label="Subtotal" value={money(totals.subtotal)} />

        {totals.itemDiscount > 0 && (
          <Rung label="Line discounts" value={money(totals.itemDiscount)} negative />
        )}
        {totals.invoiceDiscount > 0 && (
          <Rung label="Invoice discount" value={money(totals.invoiceDiscount)} negative />
        )}
        {(totals.itemDiscount > 0 || totals.invoiceDiscount > 0) && (
          <Rung label="Taxable amount" value={money(totals.taxableBase)} muted />
        )}

        {totals.taxBreakdown.map((entry) => (
          <Rung
            key={entry.id}
            label={`${entry.label} · ${entry.rateLabel}`}
            value={money(entry.amount)}
          />
        ))}

        {totals.shipping > 0 && <Rung label="Shipping" value={money(totals.shipping)} />}
        {totals.additionalCharges !== 0 && (
          <Rung label="Additional charges" value={money(totals.additionalCharges)} />
        )}
      </dl>

      {/* The signature band: the one place the brand gradient earns its keep. */}
      <div className="mt-3 grad-brand px-4 py-4 sm:px-5">
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-[0.8125rem] font-bold uppercase tracking-[0.14em] text-white/85">
            Amount due
          </span>
          <AnimatedMoney
            value={totals.grandTotal}
            currencyCode={currencyCode}
            className="font-mono text-xl font-bold tabular tracking-tight text-white sm:text-2xl"
          />
        </div>
      </div>
    </div>
  );
}
