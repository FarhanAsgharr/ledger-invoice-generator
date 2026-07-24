import type { CSSProperties, ReactNode } from 'react';
import { getStatus } from '@/constants/invoice';
import { formatDate, formatMoney } from '@/lib/format';
import { displayUrl } from '@/lib/sanitize';
import type { Invoice, InvoiceTotals } from '@/types';

/**
 * Shared building blocks for the seven templates.
 *
 * Two rules hold across every template in this folder:
 *
 *  1. **No design tokens.** Colours are literal hex. The sheet is a document,
 *     not a UI panel — it must look identical in light mode, dark mode, print
 *     and PDF. It also keeps html2canvas away from CSS custom properties.
 *  2. **No CSS grid.** html2canvas rasterises flexbox and tables faithfully and
 *     grid unreliably, so layout here is flex and `<table>` only.
 */

export interface TemplateProps {
  invoice: Invoice;
  totals: InvoiceTotals;
}

export const INK = '#181E28';
export const MUTED = '#5A6779';
export const FAINT = '#8A97A8';
export const RULE = '#E4E8ED';
export const WASH = '#F6F8FA';

/** Root style every sheet starts from: exact A4 at 96 dpi. */
export const sheetBase: CSSProperties = {
  width: '794px',
  minHeight: '1123px',
  backgroundColor: '#ffffff',
  color: INK,
  fontSize: '13px',
  lineHeight: 1.55,
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  overflow: 'hidden',
};

/* ── Small pieces ────────────────────────────────────────────────────────── */

export function Label({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        fontSize: '9px',
        fontWeight: 700,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: FAINT,
        marginBottom: '6px',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Multi-line text that keeps the user's line breaks. */
export function Lines({ text, style }: { text: string; style?: CSSProperties }) {
  if (!text?.trim()) return null;
  return <div style={{ whiteSpace: 'pre-line', ...style }}>{text}</div>;
}

export function Logo({ src, size = 64 }: { src: string | null; size?: number }) {
  if (!src) return null;
  return (
    <img
      src={src}
      alt=""
      // A logo that will not decode must not leave a broken-image glyph on an
      // invoice the customer is going to read. Remove it and let the business
      // name carry the header.
      onError={(event) => {
        event.currentTarget.style.display = 'none';
      }}
      style={{
        maxHeight: `${size}px`,
        maxWidth: `${size * 3.2}px`,
        objectFit: 'contain',
        display: 'block',
      }}
    />
  );
}

/**
 * The logo as it appears on a coloured header or sidebar.
 *
 * Dark artwork needs a white plate to stay legible against the accent; light
 * artwork must *not* get one, or a white-on-transparent logo disappears into
 * it. `logoIsLight` is measured once, when the logo is cropped.
 */
export function LogoPlate({
  business,
  size = 44,
}: {
  business: Invoice['business'];
  size?: number;
}) {
  if (!business.logo) return null;
  if (business.logoIsLight) return <Logo src={business.logo} size={size} />;
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '10px',
        padding: '8px 12px',
        display: 'inline-block',
      }}
    >
      <Logo src={business.logo} size={size} />
    </div>
  );
}

/**
 * The status stamp — the one flourish on the paper.
 *
 * Centred and set at watermark opacity rather than parked in a corner: a
 * corner-anchored stamp collides with whichever block a given template puts
 * there, and every template puts something different there. At 14% it reads
 * clearly, never hides a figure, and matches how accounting software actually
 * marks a document. Only statuses worth flagging get one — "sent" does not.
 */
export function Stamp({ invoice }: { invoice: Invoice }) {
  const status = getStatus(invoice.status);
  if (!status.stampLabel) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: '46%',
        left: '50%',
        transform: 'translate(-50%, -50%) rotate(-15deg)',
        padding: '14px 44px',
        border: `6px double ${status.stamp}`,
        borderRadius: '10px',
        color: status.stamp,
        fontSize: '58px',
        fontWeight: 800,
        letterSpacing: '0.16em',
        lineHeight: 1,
        opacity: 0.14,
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
        zIndex: 1,
      }}
    >
      {status.stampLabel}
    </div>
  );
}

/* ── Contact block ───────────────────────────────────────────────────────── */

export function ContactBlock({
  name,
  company,
  address,
  phone,
  email,
  website,
  taxLabel,
  taxValue,
  registration,
  compact,
}: {
  name?: string;
  company?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  taxLabel?: string;
  taxValue?: string;
  registration?: string;
  compact?: boolean;
}) {
  const site = displayUrl(website);
  return (
    <div style={{ fontSize: compact ? '11.5px' : '12.5px', color: MUTED, lineHeight: 1.6 }}>
      {name && <div style={{ fontWeight: 700, color: INK, fontSize: compact ? '12.5px' : '14px' }}>{name}</div>}
      {company && <div style={{ fontWeight: 600, color: INK }}>{company}</div>}
      <Lines text={address ?? ''} />
      {phone && <div>{phone}</div>}
      {email && <div>{email}</div>}
      {site && <div>{site}</div>}
      {taxValue && (
        <div style={{ marginTop: '4px' }}>
          {taxLabel ?? 'Tax ID'}: {taxValue}
        </div>
      )}
      {registration && <div>Reg no: {registration}</div>}
    </div>
  );
}

/* ── Totals ladder ───────────────────────────────────────────────────────── */

export interface TotalsProps extends TemplateProps {
  accent: string;
  /** Filled band vs. rule-only, depending on the template's register. */
  variant?: 'band' | 'rule' | 'boxed';
  align?: 'right' | 'left';
}

export function TotalsBlock({ invoice, totals, accent, variant = 'band' }: TotalsProps) {
  const money = (value: number) => formatMoney(value, invoice.currencyCode);

  const row = (label: string, value: string, options?: { negative?: boolean; muted?: boolean }) => (
    <tr key={label}>
      <td
        style={{
          padding: '4px 0',
          color: options?.muted ? FAINT : MUTED,
          fontSize: '12px',
          textAlign: 'left',
        }}
      >
        {label}
      </td>
      <td
        style={{
          padding: '4px 0 4px 24px',
          textAlign: 'right',
          fontSize: '12px',
          fontVariantNumeric: 'tabular-nums',
          color: options?.negative ? accent : INK,
          whiteSpace: 'nowrap',
        }}
      >
        {options?.negative ? `− ${value}` : value}
      </td>
    </tr>
  );

  return (
    <div style={{ width: '290px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {row('Subtotal', money(totals.subtotal))}
          {totals.itemDiscount > 0 && row('Line discounts', money(totals.itemDiscount), { negative: true })}
          {totals.invoiceDiscount > 0 &&
            row('Invoice discount', money(totals.invoiceDiscount), { negative: true })}
          {(totals.itemDiscount > 0 || totals.invoiceDiscount > 0) &&
            row('Taxable amount', money(totals.taxableBase), { muted: true })}
          {totals.taxBreakdown.map((entry) =>
            row(`${entry.label} ${entry.rateLabel}`, money(entry.amount)),
          )}
          {totals.shipping > 0 && row('Shipping', money(totals.shipping))}
          {totals.additionalCharges !== 0 &&
            row('Additional charges', money(totals.additionalCharges))}
        </tbody>
      </table>

      {variant === 'band' ? (
        <div
          style={{
            marginTop: '12px',
            backgroundColor: accent,
            color: '#ffffff',
            padding: '12px 16px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            Amount due
          </span>
          <span style={{ fontSize: '19px', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
            {money(totals.grandTotal)}
          </span>
        </div>
      ) : variant === 'boxed' ? (
        <div
          style={{
            marginTop: '12px',
            border: `2px solid ${accent}`,
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: accent }}>
            Amount due
          </span>
          <span style={{ fontSize: '18px', fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: INK }}>
            {money(totals.grandTotal)}
          </span>
        </div>
      ) : (
        <div
          style={{
            marginTop: '10px',
            paddingTop: '10px',
            borderTop: `2px solid ${INK}`,
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Amount due
          </span>
          <span style={{ fontSize: '18px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
            {money(totals.grandTotal)}
          </span>
        </div>
      )}
    </div>
  );
}

/* ── Footer ──────────────────────────────────────────────────────────────── */

export function FooterBlock({
  invoice,
  accent,
  wordsLine,
}: {
  invoice: Invoice;
  accent: string;
  wordsLine?: string;
}) {
  const hasNotes = Boolean(invoice.notes?.trim());
  const hasTerms = Boolean(invoice.terms?.trim());
  if (!hasNotes && !hasTerms && !wordsLine) return null;

  return (
    <div style={{ marginTop: 'auto', paddingTop: '32px' }} className="avoid-break">
      {wordsLine && (
        <div
          style={{
            fontSize: '11.5px',
            color: MUTED,
            borderTop: `1px solid ${RULE}`,
            paddingTop: '10px',
            marginBottom: '18px',
          }}
        >
          <span style={{ fontWeight: 700, color: INK }}>In words: </span>
          {wordsLine}
        </div>
      )}
      <div style={{ display: 'flex', gap: '40px' }}>
        {hasNotes && (
          <div style={{ flex: 1 }}>
            <Label style={{ color: accent }}>Notes</Label>
            <Lines text={invoice.notes} style={{ fontSize: '11.5px', color: MUTED }} />
          </div>
        )}
        {hasTerms && (
          <div style={{ flex: 1 }}>
            <Label style={{ color: accent }}>Terms &amp; conditions</Label>
            <Lines text={invoice.terms} style={{ fontSize: '11.5px', color: MUTED }} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Meta rows ───────────────────────────────────────────────────────────── */

export function metaRows(invoice: Invoice): { label: string; value: string }[] {
  const rows = [
    { label: 'Invoice date', value: formatDate(invoice.issueDate) },
    { label: 'Due date', value: formatDate(invoice.dueDate) },
  ];
  if (invoice.poNumber?.trim()) rows.push({ label: 'PO number', value: invoice.poNumber });
  if (invoice.paymentTerms?.trim()) rows.push({ label: 'Terms', value: invoice.paymentTerms });
  return rows;
}

/* ── Items table ─────────────────────────────────────────────────────────── */

export interface ItemsTableProps extends TemplateProps {
  accent: string;
  /** `filled` paints the header row; `rule` uses a single line; `banded` stripes rows. */
  head?: 'filled' | 'rule' | 'banded' | 'minimal';
}

export function ItemsTable({ invoice, totals, accent, head = 'rule' }: ItemsTableProps) {
  const money = (value: number) => formatMoney(value, invoice.currencyCode);
  const showTax = invoice.perItemTax;
  const showDiscount = totals.lines.some((line) => line.discount > 0);

  const headCellBase: CSSProperties = {
    fontSize: '9.5px',
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    padding: head === 'filled' ? '10px 10px' : '0 10px 8px',
    color: head === 'filled' ? '#ffffff' : FAINT,
    whiteSpace: 'nowrap',
  };

  const numeric: CSSProperties = {
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
  };

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '8px' }}>
      <thead>
        <tr
          style={{
            backgroundColor: head === 'filled' ? accent : 'transparent',
            borderBottom: head === 'filled' ? 'none' : `1.5px solid ${head === 'minimal' ? RULE : INK}`,
          }}
        >
          <th style={{ ...headCellBase, textAlign: 'left', paddingLeft: head === 'filled' ? '14px' : '0' }}>
            Description
          </th>
          <th style={{ ...headCellBase, ...numeric, width: '58px' }}>Qty</th>
          <th style={{ ...headCellBase, ...numeric, width: '86px' }}>Unit price</th>
          {showDiscount && <th style={{ ...headCellBase, ...numeric, width: '74px' }}>Discount</th>}
          {showTax && <th style={{ ...headCellBase, ...numeric, width: '54px' }}>Tax</th>}
          <th
            style={{
              ...headCellBase,
              ...numeric,
              width: '96px',
              paddingRight: head === 'filled' ? '14px' : '0',
            }}
          >
            Amount
          </th>
        </tr>
      </thead>
      <tbody>
        {invoice.items.map((item, index) => {
          const line = totals.lines[index];
          const banded = head === 'banded' && index % 2 === 1;
          const cell: CSSProperties = {
            padding: '11px 10px',
            borderBottom: `1px solid ${RULE}`,
            fontSize: '12px',
            verticalAlign: 'top',
            backgroundColor: banded ? WASH : 'transparent',
          };
          return (
            <tr key={item.id} className="avoid-break">
              <td style={{ ...cell, paddingLeft: head === 'filled' ? '14px' : '0' }}>
                <div style={{ fontWeight: 600, color: INK }}>{item.name || 'Untitled item'}</div>
                {item.description?.trim() && (
                  <div style={{ color: MUTED, fontSize: '11px', marginTop: '2px', whiteSpace: 'pre-line' }}>
                    {item.description}
                  </div>
                )}
              </td>
              <td style={{ ...cell, ...numeric }}>{item.quantity}</td>
              <td style={{ ...cell, ...numeric }}>{money(item.unitPrice)}</td>
              {showDiscount && (
                <td style={{ ...cell, ...numeric, color: line?.discount ? accent : FAINT }}>
                  {line?.discount ? `− ${money(line.discount)}` : '—'}
                </td>
              )}
              {showTax && (
                <td style={{ ...cell, ...numeric, color: MUTED }}>
                  {item.taxRate ? `${item.taxRate}%` : '—'}
                </td>
              )}
              <td
                style={{
                  ...cell,
                  ...numeric,
                  fontWeight: 600,
                  paddingRight: head === 'filled' ? '14px' : '0',
                }}
              >
                {money(line?.total ?? 0)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
