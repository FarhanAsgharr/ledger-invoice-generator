import {
  ContactBlock,
  ItemsTable,
  Label,
  Lines,
  LogoPlate,
  Stamp,
  TotalsBlock,
  metaRows,
} from './shared';
import { sheetRoot, useSheetPalette } from './SheetTheme';
import type { TemplateProps } from './shared';
import { displayUrl } from '@/lib/sanitize';

/** Sidebar for your details, wide table for the work. */
export function ProfessionalTemplate({ invoice, totals }: TemplateProps) {
  const palette = useSheetPalette();
  const { INK, MUTED, accent, accentFill, accentInk } = palette;
  const site = displayUrl(invoice.business.website);

  return (
    <div style={{ ...sheetRoot(palette), flexDirection: 'row' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: '232px',
          flexShrink: 0,
          backgroundColor: accentFill,
          color: accentInk,
          padding: '44px 26px',
          display: 'flex',
          flexDirection: 'column',
          gap: '28px',
        }}
      >
        <div>
          {invoice.business.logo && (
            <div style={{ marginBottom: '14px' }}>
              <LogoPlate business={invoice.business} size={40} />
            </div>
          )}
          <div style={{ fontSize: '17px', fontWeight: 800, letterSpacing: '-0.015em' }}>
            {invoice.business.name || 'Your business'}
          </div>
        </div>

        <div style={{ fontSize: '11.5px', lineHeight: 1.7, opacity: 0.92 }}>
          <Lines text={invoice.business.address} />
          {invoice.business.phone && (
            <div style={{ marginTop: '8px' }}>{invoice.business.phone}</div>
          )}
          {invoice.business.email && <div>{invoice.business.email}</div>}
          {site && <div>{site}</div>}
        </div>

        {(invoice.business.taxNumber || invoice.business.registrationNumber) && (
          <div style={{ fontSize: '11px', lineHeight: 1.7, opacity: 0.82 }}>
            <div
              style={{
                fontSize: '9px',
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                marginBottom: '6px',
                opacity: 0.8,
              }}
            >
              Registration
            </div>
            {invoice.business.taxNumber && <div>Tax no {invoice.business.taxNumber}</div>}
            {invoice.business.registrationNumber && (
              <div>Reg no {invoice.business.registrationNumber}</div>
            )}
          </div>
        )}

        {invoice.notes?.trim() && (
          <div style={{ marginTop: 'auto', fontSize: '11px', lineHeight: 1.7, opacity: 0.92 }}>
            <div
              style={{
                fontSize: '9px',
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                marginBottom: '6px',
                opacity: 0.8,
              }}
            >
              Payment
            </div>
            <Lines text={invoice.notes} />
          </div>
        )}
      </aside>

      {/* Main */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          padding: '44px 44px 40px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        <Stamp invoice={invoice} />

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '24px',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.24em',
                textTransform: 'uppercase',
                color: accent,
              }}
            >
              Invoice
            </div>
            <div
              style={{
                fontSize: '25px',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                fontVariantNumeric: 'tabular-nums',
                color: INK,
              }}
            >
              {invoice.number}
            </div>
          </div>
          <div style={{ width: '190px' }}>
            {metaRows(invoice).map((row) => (
              <div
                key={row.label}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '11.5px',
                  color: MUTED,
                  padding: '2px 0',
                }}
              >
                <span>{row.label}</span>
                <span style={{ color: INK, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '32px', marginTop: '30px' }}>
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
              compact
            />
          </div>
          {!invoice.customer.shipToBilling && invoice.customer.shippingAddress.trim() && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <Label style={{ color: accent }}>Ship to</Label>
              <ContactBlock address={invoice.customer.shippingAddress} compact />
            </div>
          )}
        </div>

        <div style={{ marginTop: '26px' }}>
          <ItemsTable invoice={invoice} totals={totals} accent={accent} head="rule" />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '22px' }}>
          <TotalsBlock invoice={invoice} totals={totals} accent={accent} variant="band" />
        </div>

        {invoice.terms?.trim() && (
          <div style={{ marginTop: 'auto', paddingTop: '30px' }} className="avoid-break">
            <Label style={{ color: accent }}>Terms &amp; conditions</Label>
            <Lines text={invoice.terms} style={{ fontSize: '11px', color: MUTED }} />
          </div>
        )}
      </div>
    </div>
  );
}
