import {
  ContactBlock,
  FooterBlock,
  ItemsTable,
  Label,
  LogoPlate,
  MUTED,
  Stamp,
  TotalsBlock,
  metaRows,
  sheetBase,
} from './shared';
import type { TemplateProps } from './shared';

/** Colour-blocked header, generous spacing. The default. */
export function ModernTemplate({ invoice, totals }: TemplateProps) {
  const accent = invoice.accent;

  return (
    <div style={sheetBase}>
      <Stamp invoice={invoice} />

      <header
        style={{
          backgroundColor: accent,
          color: '#ffffff',
          padding: '40px 56px 34px',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '32px',
        }}
      >
        <div style={{ minWidth: 0 }}>
          {invoice.business.logo && (
            <div style={{ marginBottom: '14px' }}>
              <LogoPlate business={invoice.business} size={44} />
            </div>
          )}
          <div style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.02em' }}>
            {invoice.business.name || 'Your business'}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.85, whiteSpace: 'pre-line', marginTop: '6px' }}>
            {invoice.business.address}
          </div>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              opacity: 0.8,
            }}
          >
            Invoice
          </div>
          <div
            style={{
              fontSize: '26px',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              marginTop: '2px',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {invoice.number}
          </div>
        </div>
      </header>

      <div style={{ padding: '34px 56px 48px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ display: 'flex', gap: '40px', marginBottom: '34px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Label style={{ color: accent }}>Bill to</Label>
            <ContactBlock
              name={invoice.customer.name}
              company={invoice.customer.company}
              address={invoice.customer.billingAddress}
              phone={invoice.customer.phone}
              email={invoice.customer.email}
              taxLabel="Tax ID"
              taxValue={invoice.customer.taxId}
            />
          </div>

          {!invoice.customer.shipToBilling && invoice.customer.shippingAddress.trim() && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <Label style={{ color: accent }}>Ship to</Label>
              <ContactBlock address={invoice.customer.shippingAddress} />
            </div>
          )}

          <div style={{ width: '208px', flexShrink: 0 }}>
            <Label style={{ color: accent }}>Details</Label>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <tbody>
                {metaRows(invoice).map((row) => (
                  <tr key={row.label}>
                    <td style={{ fontSize: '11.5px', color: MUTED, padding: '2px 0' }}>{row.label}</td>
                    <td
                      style={{
                        fontSize: '11.5px',
                        fontWeight: 600,
                        textAlign: 'right',
                        padding: '2px 0',
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

        <ItemsTable invoice={invoice} totals={totals} accent={accent} head="filled" />

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
          <TotalsBlock invoice={invoice} totals={totals} accent={accent} variant="band" />
        </div>

        <FooterBlock invoice={invoice} accent={accent} />
      </div>
    </div>
  );
}
