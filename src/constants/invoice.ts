import type { InvoiceStatus } from '@/types';

export interface StatusMeta {
  id: InvoiceStatus;
  label: string;
  /** Tailwind classes for the editor chip. */
  chip: string;
  /** Hex used for the stamp on the paper — templates are theme-independent. */
  stamp: string;
  /** Shown on the sheet as a stamp. Draft and cancelled are worth flagging too. */
  stampLabel: string | null;
}

export const STATUSES: StatusMeta[] = [
  {
    id: 'draft',
    label: 'Draft',
    chip: 'bg-ink-500/10 text-ink-600 dark:bg-ink-100/10 dark:text-ink-300',
    stamp: '#7C8AA0',
    stampLabel: 'DRAFT',
  },
  {
    id: 'sent',
    label: 'Sent',
    chip: 'bg-blue-500/10 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300',
    stamp: '#1D4ED8',
    stampLabel: null,
  },
  {
    id: 'partial',
    label: 'Part paid',
    chip: 'bg-amber-500/15 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300',
    stamp: '#A87300',
    stampLabel: 'PART PAID',
  },
  {
    id: 'paid',
    label: 'Paid',
    chip: 'bg-brand-500/15 text-brand-700 dark:bg-brand-400/15 dark:text-brand-300',
    stamp: '#0E7C66',
    stampLabel: 'PAID',
  },
  {
    id: 'overdue',
    label: 'Overdue',
    chip: 'bg-danger-400/15 text-danger-600 dark:bg-danger-400/15 dark:text-danger-300',
    stamp: '#CE2F35',
    stampLabel: 'OVERDUE',
  },
  {
    id: 'cancelled',
    label: 'Cancelled',
    chip: 'bg-ink-500/10 text-ink-500 dark:bg-ink-100/10 dark:text-ink-400',
    stamp: '#5A6779',
    stampLabel: 'CANCELLED',
  },
];

export const STATUS_MAP = new Map(STATUSES.map((s) => [s.id, s]));

export function getStatus(id: InvoiceStatus): StatusMeta {
  return STATUS_MAP.get(id) ?? STATUSES[0];
}

/** Common terms. `days` drives the due-date shortcut; null means "no shift". */
export const PAYMENT_TERMS: { label: string; days: number | null }[] = [
  { label: 'Due on receipt', days: 0 },
  { label: 'Net 7', days: 7 },
  { label: 'Net 14', days: 14 },
  { label: 'Net 15', days: 15 },
  { label: 'Net 30', days: 30 },
  { label: 'Net 45', days: 45 },
  { label: 'Net 60', days: 60 },
  { label: 'Net 90', days: 90 },
  { label: '50% upfront, 50% on delivery', days: 14 },
  { label: 'Custom', days: null },
];

/** Ready-made tax rules users can drop in rather than typing rates by hand. */
export const TAX_PRESETS: { label: string; value: number }[] = [
  { label: 'VAT', value: 20 },
  { label: 'VAT (reduced)', value: 5 },
  { label: 'GST', value: 18 },
  { label: 'GST (AU/NZ)', value: 10 },
  { label: 'Sales tax', value: 8.25 },
  { label: 'Service tax', value: 15 },
  { label: 'Withholding tax', value: 10 },
];

export const DEFAULT_TERMS =
  'Payment is due by the date shown above. Late payments may accrue interest at 1.5% per month. Please quote the invoice number with your transfer.';

export const DEFAULT_NOTES = 'Thanks for your business.';
