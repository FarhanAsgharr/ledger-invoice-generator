import {
  ContactBlock,
  FooterBlock,
  INK,
  Label,
  Logo,
  MUTED,
  RULE,
  Stamp,
  TotalsBlock,
  WASH,
  metaRows,
  sheetBase,
} from './shared';
import type { TemplateProps } from './shared';
import { amountInWords, formatMoney } from '@/lib/format';

/** The bordered, ruled invoice accountants have filed for decades. */
export function ClassicTemplate({ invoice, totals }: TemplateProps) {
  const accent = invoice.accent;
  const money = (value: number) => formatMoney(value, invoice.currencyCode);
  const showTax = invoice.perItemTax;
  const showDiscount = totals.lines.some((line) => line.discount > 0);

  const cellBorder = `1px solid ${RULE}`;
  const headCell = {
    padding: '9px 10px',
    fontSize: '9.5px',
    fontWeight: 700 as const,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color: INK,
    borderRight: cellBorder,
    borderBottom: `1.5px solid ${INK}`,
    backgroundColor: WASH,
  };

  return (
    <div style={{ ...sheetBase, padding: '28px' }}>
      <div
        style={{
          border: `2px solid ${INK}`,
          padding: '32px 34px 28px',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        <Stamp invoice={invoice} />

        <div style={{ textAlign: 'center', borderBottom: `2px solid ${INK}`, paddingBottom: '14px' }}>
          <div
            style={{
              fontSize: '20px',
              fontWeight: 800,
              letterSpacing: '0.34em',
              textTransform: 'uppercase',
              color: accent,
            }}
          >
            Invoice
          </div>
        </div>

        <div style={{ display: 'flex', gap: '28px', paddingTop: '20px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {invoice.business.logo && (
              <div style={{ marginBottom: '10px' }}>
                <Logo src={invoice.business.logo} size={42} />
              </div>
            )}
            <Label>From</Label>
            <ContactBlock
              name={invoice.business.name}
              address={invoice.business.address}
              phone={invoice.business.phone}
              email={invoice.business.email}
              taxLabel="Tax no"
              taxValue={invoice.business.taxNumber}
              registration={invoice.business.registrationNumber}
              compact
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Label>To</Label>
            <ContactBlock
              name={invoice.customer.name}
              company={invoice.customer.company}
              address={invoice.customer.billingAddress}
              phone={invoice.customer.phone}
              email={invoice.customer.email}
              taxLabel="Tax ID"
              taxValue={invoice.customer.taxId}
              compact
            />
          </div>
          <div style={{ width: '190px', flexShrink: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: cellBorder }}>
              <tbody>
                <tr>
                  <td style={{ padding: '6px 9px', fontSize: '10.5px', color: MUTED, borderBottom: cellBorder }}>
                    No.
                  </td>
                  <td
                    style={{
                      padding: '6px 9px',
                      fontSize: '11px',
                      fontWeight: 700,
                      textAlign: 'right',
                      borderBottom: cellBorder,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {invoice.number}
                  </td>
                </tr>
                {metaRows(invoice).map((row) => (
                  <tr key={row.label}>
                    <td style={{ padding: '6px 9px', fontSize: '10.5px', color: MUTED, borderBottom: cellBorder }}>
                      {row.label}
                    </td>
                    <td
                      style={{
                        padding: '6px 9px',
                        fontSize: '11px',
                        textAlign: 'right',
                        borderBottom: cellBorder,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '24px', border: cellBorder }}>
          <thead>
            <tr>
              <th style={{ ...headCell, width: '32px', textAlign: 'center' }}>#</th>
              <th style={{ ...headCell, textAlign: 'left' }}>Description</th>
              <th style={{ ...headCell, textAlign: 'right', width: '56px' }}>Qty</th>
              <th style={{ ...headCell, textAlign: 'right', width: '84px' }}>Rate</th>
              {showDiscount && <th style={{ ...headCell, textAlign: 'right', width: '72px' }}>Disc.</th>}
              {showTax && <th style={{ ...headCell, textAlign: 'right', width: '52px' }}>Tax</th>}
              <th style={{ ...headCell, textAlign: 'right', width: '94px', borderRight: 'none' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, index) => {
              const line = totals.lines[index];
              const cell = {
                padding: '9px 10px',
                fontSize: '11.5px',
                borderRight: cellBorder,
                borderBottom: cellBorder,
                verticalAlign: 'top' as const,
              };
              const numeric = {
                textAlign: 'right' as const,
                fontVariantNumeric: 'tabular-nums' as const,
                whiteSpace: 'nowrap' as const,
              };
              return (
                <tr key={item.id} className="avoid-break">
                  <td style={{ ...cell, textAlign: 'center', color: MUTED }}>{index + 1}</td>
                  <td style={cell}>
                    <div style={{ fontWeight: 600 }}>{item.name || 'Untitled item'}</div>
                    {item.description?.trim() && (
                      <div style={{ color: MUTED, fontSize: '10.5px', whiteSpace: 'pre-line' }}>
                        {item.description}
                      </div>
                    )}
                  </td>
                  <td style={{ ...cell, ...numeric }}>{item.quantity}</td>
                  <td style={{ ...cell, ...numeric }}>{money(item.unitPrice)}</td>
                  {showDiscount && (
                    <td style={{ ...cell, ...numeric }}>{line?.discount ? `− ${money(line.discount)}` : '—'}</td>
                  )}
                  {showTax && (
                    <td style={{ ...cell, ...numeric }}>{item.taxRate ? `${item.taxRate}%` : '—'}</td>
                  )}
                  <td style={{ ...cell, ...numeric, borderRight: 'none', fontWeight: 600 }}>
                    {money(line?.total ?? 0)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '32px', marginTop: '20px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Label>Amount in words</Label>
            <div style={{ fontSize: '11.5px', color: INK, fontStyle: 'italic' }}>
              {amountInWords(totals.grandTotal, invoice.currencyCode)}
            </div>
          </div>
          <TotalsBlock invoice={invoice} totals={totals} accent={accent} variant="boxed" />
        </div>

        <FooterBlock invoice={invoice} accent={accent} />

        <div
          style={{
            marginTop: '36px',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <div style={{ width: '220px', textAlign: 'center' }}>
            <div style={{ borderTop: `1px solid ${INK}`, paddingTop: '6px', fontSize: '10.5px', color: MUTED }}>
              Authorised signature
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
