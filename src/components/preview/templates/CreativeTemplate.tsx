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

/** Oversized number, asymmetric grid, a splash of colour. */
export function CreativeTemplate({ invoice, totals }: TemplateProps) {
  const palette = useSheetPalette();
  const { INK, MUTED, accent, accentFill } = palette;

  return (
    <div style={{ ...sheetRoot(palette), padding: '0' }}>
      <Stamp invoice={invoice} />

      {/* Corner wash — the one decorative element, anchored so it never crowds text. */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '-140px',
          right: '-140px',
          width: '360px',
          height: '360px',
          borderRadius: '50%',
          backgroundColor: accentFill,
          opacity: 0.1,
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '0',
          left: '0',
          width: '10px',
          height: '210px',
          backgroundColor: accentFill,
        }}
      />

      <div style={{ padding: '54px 56px 48px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <header
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '28px',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: '58px',
                fontWeight: 800,
                letterSpacing: '-0.045em',
                lineHeight: 0.92,
                color: accent,
              }}
            >
              Invoice
            </div>
            <div
              style={{
                marginTop: '10px',
                fontSize: '15px',
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
                color: INK,
              }}
            >
              {invoice.number}
            </div>
          </div>

          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            {invoice.business.logo && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                <Logo src={invoice.business.logo} size={44} />
              </div>
            )}
            <div style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '-0.015em' }}>
              {invoice.business.name || 'Your business'}
            </div>
            <div
              style={{ fontSize: '11.5px', color: MUTED, whiteSpace: 'pre-line', marginTop: '4px' }}
            >
              {invoice.business.address}
            </div>
            {invoice.business.email && (
              <div style={{ fontSize: '11.5px', color: MUTED }}>{invoice.business.email}</div>
            )}
          </div>
        </header>

        <div style={{ display: 'flex', gap: '36px', marginTop: '44px' }}>
          <div style={{ flex: 1.4, minWidth: 0 }}>
            <Label style={{ color: accent }}>Billed to</Label>
            <ContactBlock
              name={invoice.customer.name}
              company={invoice.customer.company}
              address={invoice.customer.billingAddress}
              email={invoice.customer.email}
              phone={invoice.customer.phone}
              taxLabel="Tax ID"
              taxValue={invoice.customer.taxId}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Label style={{ color: accent }}>When</Label>
            {metaRows(invoice).map((row) => (
              <div key={row.label} style={{ marginBottom: '8px' }}>
                <div
                  style={{
                    fontSize: '10px',
                    color: MUTED,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                  }}
                >
                  {row.label}
                </div>
                <div
                  style={{ fontSize: '13px', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
                >
                  {row.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: '34px' }}>
          <ItemsTable invoice={invoice} totals={totals} accent={accent} head="rule" />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '26px' }}>
          <TotalsBlock invoice={invoice} totals={totals} accent={accent} variant="band" />
        </div>

        <FooterBlock invoice={invoice} accent={accent} />
      </div>
    </div>
  );
}
