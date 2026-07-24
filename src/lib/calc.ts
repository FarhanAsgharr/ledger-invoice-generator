import { getCurrency } from '@/constants/currencies';
import { formatAmount, formatRate } from '@/lib/format';
import { round, toNumber } from '@/lib/utils';
import type { Discount, Invoice, InvoiceTotals, LineTotals, TaxBreakdownEntry } from '@/types';

/**
 * The totals engine. Pure, synchronous and the single source of truth for every
 * number on the invoice — the editor ladder, the preview and the PDF all call
 * this, so they can never disagree.
 *
 * Order of operations (the conventional one, and the one auditors expect):
 *
 *   1. line gross      = quantity × unit price
 *   2. line discount   = per-line flat or %
 *   3. subtotal        = Σ line gross
 *   4. invoice discount applies to (subtotal − line discounts)
 *   5. taxable base    = subtotal − line discounts − invoice discount
 *   6. per-line tax    = line net, scaled by the invoice-discount ratio, × rate
 *   7. invoice taxes   = stacked in order; compound rules include prior tax
 *   8. grand total     = taxable base + tax + shipping + additional charges
 */

/** Resolve a flat/percentage pair against a base amount. Never returns NaN. */
export function resolveDiscount(discount: Discount | undefined, base: number): number {
  if (!discount) return 0;
  const value = Math.max(0, toNumber(discount.value));
  if (value === 0) return 0;
  const amount = discount.kind === 'percentage' ? (base * value) / 100 : value;
  // A discount can never exceed what it is discounting.
  return Math.min(Math.max(amount, 0), Math.max(base, 0));
}

export function calculateLine(
  item: Invoice['items'][number],
  options: { perItemTax: boolean; decimals: number },
): LineTotals {
  const quantity = Math.max(0, toNumber(item.quantity));
  const unitPrice = Math.max(0, toNumber(item.unitPrice));
  const gross = round(quantity * unitPrice, options.decimals);
  const discount = round(resolveDiscount(item.discount, gross), options.decimals);
  const net = round(gross - discount, options.decimals);
  const rate = options.perItemTax ? Math.max(0, toNumber(item.taxRate)) : 0;
  const tax = round((net * rate) / 100, options.decimals);
  return { gross, discount, net, tax, total: round(net + tax, options.decimals) };
}

export function calculateTotals(invoice: Invoice): InvoiceTotals {
  const { decimals } = getCurrency(invoice.currencyCode);
  const items = invoice.items ?? [];

  const lines = items.map((item) => calculateLine(item, { perItemTax: invoice.perItemTax, decimals }));

  const subtotal = round(
    lines.reduce((sum, line) => sum + line.gross, 0),
    decimals,
  );
  const itemDiscount = round(
    lines.reduce((sum, line) => sum + line.discount, 0),
    decimals,
  );
  const netSubtotal = round(subtotal - itemDiscount, decimals);
  const invoiceDiscount = round(resolveDiscount(invoice.discount, netSubtotal), decimals);
  const taxableBase = round(netSubtotal - invoiceDiscount, decimals);

  // An invoice-level discount reduces every line proportionally, so per-line tax
  // has to shrink with it. Without this the tax would be charged on money the
  // customer never owes.
  const discountRatio = netSubtotal > 0 ? taxableBase / netSubtotal : 0;

  const taxBreakdown: TaxBreakdownEntry[] = [];

  if (invoice.perItemTax) {
    // Group per-line tax by rate so the sheet shows "VAT 20% … 240.00" rather
    // than one row per item.
    const byRate = new Map<number, number>();
    items.forEach((item, index) => {
      const rate = Math.max(0, toNumber(item.taxRate));
      if (rate <= 0) return;
      const taxable = lines[index].net * discountRatio;
      byRate.set(rate, (byRate.get(rate) ?? 0) + (taxable * rate) / 100);
    });
    [...byRate.entries()]
      .sort((a, b) => a[0] - b[0])
      .forEach(([rate, amount]) => {
        taxBreakdown.push({
          id: `item-tax-${rate}`,
          label: 'Item tax',
          rateLabel: `${formatRate(rate)}%`,
          amount: round(amount, decimals),
        });
      });
  }

  let stackedTax = taxBreakdown.reduce((sum, entry) => sum + entry.amount, 0);

  for (const rule of invoice.taxes ?? []) {
    if (!rule.enabled) continue;
    const value = toNumber(rule.value);
    if (value === 0) continue;

    let amount: number;
    let rateLabel: string;
    if (rule.kind === 'percentage') {
      const base = rule.compound ? taxableBase + stackedTax : taxableBase;
      amount = (base * value) / 100;
      rateLabel = `${formatRate(value)}%`;
    } else {
      amount = value;
      rateLabel = formatAmount(value, invoice.currencyCode);
    }
    amount = round(amount, decimals);
    stackedTax = round(stackedTax + amount, decimals);
    taxBreakdown.push({
      id: rule.id,
      label: rule.label.trim() || 'Tax',
      rateLabel,
      amount,
    });
  }

  const taxTotal = round(
    taxBreakdown.reduce((sum, entry) => sum + entry.amount, 0),
    decimals,
  );
  const shipping = round(Math.max(0, toNumber(invoice.shipping)), decimals);
  const additionalCharges = round(
    (invoice.additionalCharges ?? []).reduce((sum, charge) => sum + toNumber(charge.amount), 0),
    decimals,
  );

  const grandTotal = round(taxableBase + taxTotal + shipping + additionalCharges, decimals);

  return {
    subtotal,
    itemDiscount,
    invoiceDiscount,
    taxableBase,
    taxBreakdown,
    taxTotal,
    shipping,
    additionalCharges,
    grandTotal,
    lines,
  };
}
