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

/** Type and rules only. Nothing competes with the numbers. */
export function MinimalTemplate({ invoice, totals }: TemplateProps) {
  const palette = useSheetPalette();
  const { INK, MUTED, accent } = palette;

  return (
    <div style={{ ...sheetRoot(palette), padding: '64px 64px 56px' }}>
      <Stamp invoice={invoice} />

      <header
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: '32px',
          paddingBottom: '18px',
          borderBottom: `1px solid ${INK}`,
        }}
      >
        <div style={{ minWidth: 0 }}>
          {invoice.business.logo && <Logo src={invoice.business.logo} size={36} />}
          <div
            style={{
              fontSize: '15px',
              fontWeight: 700,
              letterSpacing: '-0.01em',
              marginTop: invoice.business.logo ? '10px' : 0,
            }}
          >
            {invoice.business.name || 'Your business'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontSize: '10px',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: MUTED,
            }}
          >
            Invoice
          </div>
          <div
            style={{
              fontSize: '17px',
              fontWeight: 600,
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.01em',
            }}
          >
            {invoice.number}
          </div>
        </div>
      </header>

      <div style={{ display: 'flex', gap: '48px', marginTop: '36px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Label>From</Label>
          <ContactBlock
            address={invoice.business.address}
            phone={invoice.business.phone}
            email={invoice.business.email}
            website={invoice.business.website}
            taxLabel="Tax no"
            taxValue={invoice.business.taxNumber}
            compact
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Label>To</Label>
          <ContactBlock
            name={invoice.customer.name}
            company={invoice.customer.company}
            address={invoice.customer.billingAddress}
            email={invoice.customer.email}
            taxLabel="Tax ID"
            taxValue={invoice.customer.taxId}
            compact
          />
        </div>
        <div style={{ width: '170px', flexShrink: 0 }}>
          <Label>Dated</Label>
          {metaRows(invoice).map((row) => (
            <div
              key={row.label}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11.5px',
                color: MUTED,
              }}
            >
              <span>{row.label}</span>
              <span style={{ color: INK, fontVariantNumeric: 'tabular-nums' }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: '40px' }}>
        <ItemsTable invoice={invoice} totals={totals} accent={accent} head="minimal" />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '28px' }}>
        <TotalsBlock invoice={invoice} totals={totals} accent={accent} variant="rule" />
      </div>

      <FooterBlock invoice={invoice} accent={accent} />
    </div>
  );
}
