import {
  ContactBlock,
  FooterBlock,
  ItemsTable,
  Label,
  Logo,
  Stamp,
  TotalsBlock,
  metaRows,
} from './shared';
import { sheetRoot, useSheetPalette } from './SheetTheme';
import type { TemplateProps } from './shared';

/** Banded table and a boxed summary. Built for procurement teams. */
export function CorporateTemplate({ invoice, totals }: TemplateProps) {
  const palette = useSheetPalette();
  const { INK, MUTED, PAPER, RULE, WASH, accent, accentFill, accentInk } = palette;

  return (
    <div style={sheetRoot(palette)}>
      <Stamp invoice={invoice} />

      <div style={{ height: '8px', backgroundColor: accent }} />

      <div style={{ padding: '36px 52px 48px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', gap: '32px' }}>
          <div style={{ minWidth: 0 }}>
            {invoice.business.logo && (
              <div style={{ marginBottom: '12px' }}>
                <Logo src={invoice.business.logo} size={48} />
              </div>
            )}
            <div
              style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.015em', color: INK }}
            >
              {invoice.business.name || 'Your business'}
            </div>
            <ContactBlock
              address={invoice.business.address}
              phone={invoice.business.phone}
              email={invoice.business.email}
              website={invoice.business.website}
              taxLabel="Tax no"
              taxValue={invoice.business.taxNumber}
              registration={invoice.business.registrationNumber}
              compact
            />
          </div>

          <div style={{ width: '250px', flexShrink: 0 }}>
            <div
              style={{
                backgroundColor: accentFill,
                color: accentInk,
                padding: '10px 14px',
                fontSize: '13px',
                fontWeight: 800,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
              }}
            >
              Tax invoice
            </div>
            <table
              style={{ width: '100%', borderCollapse: 'collapse', border: `1px solid ${RULE}` }}
            >
              <tbody>
                <tr>
                  <td
                    style={{
                      padding: '7px 12px',
                      fontSize: '11px',
                      color: MUTED,
                      backgroundColor: WASH,
                    }}
                  >
                    Invoice no
                  </td>
                  <td
                    style={{
                      padding: '7px 12px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      textAlign: 'right',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {invoice.number}
                  </td>
                </tr>
                {metaRows(invoice).map((row, index) => (
                  <tr key={row.label}>
                    <td
                      style={{
                        padding: '7px 12px',
                        fontSize: '11px',
                        color: MUTED,
                        backgroundColor: index % 2 === 0 ? PAPER : WASH,
                      }}
                    >
                      {row.label}
                    </td>
                    <td
                      style={{
                        padding: '7px 12px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        textAlign: 'right',
                        backgroundColor: index % 2 === 0 ? PAPER : WASH,
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
        </header>

        <div style={{ display: 'flex', gap: '32px', marginTop: '32px' }}>
          <div
            style={{
              flex: 1,
              minWidth: 0,
              backgroundColor: WASH,
              padding: '16px 18px',
              borderLeft: `3px solid ${accent}`,
            }}
          >
            <Label style={{ color: accent }}>Bill to</Label>
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
          {!invoice.customer.shipToBilling && invoice.customer.shippingAddress.trim() && (
            <div style={{ flex: 1, minWidth: 0, backgroundColor: WASH, padding: '16px 18px' }}>
              <Label>Deliver to</Label>
              <ContactBlock address={invoice.customer.shippingAddress} compact />
            </div>
          )}
        </div>

        <div style={{ marginTop: '28px' }}>
          <ItemsTable invoice={invoice} totals={totals} accent={accent} head="banded" />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
          <TotalsBlock invoice={invoice} totals={totals} accent={accent} variant="boxed" />
        </div>

        <FooterBlock invoice={invoice} accent={accent} />
      </div>
    </div>
  );
}
