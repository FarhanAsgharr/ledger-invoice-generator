import {
  ContactBlock,
  FooterBlock,
  INK,
  ItemsTable,
  Label,
  Logo,
  MUTED,
  RULE,
  Stamp,
  TotalsBlock,
  metaRows,
  sheetBase,
} from './shared';
import type { TemplateProps } from './shared';

const SERIF = '"Playfair Display", ui-serif, Georgia, serif';

/** Serif display, hairline rules, wide margins. For studios. */
export function ElegantTemplate({ invoice, totals }: TemplateProps) {
  const accent = invoice.accent;

  return (
    <div style={{ ...sheetBase, padding: '68px 72px 60px' }}>
      <Stamp invoice={invoice} />

      <header style={{ textAlign: 'center', paddingBottom: '28px', borderBottom: `1px solid ${RULE}` }}>
        {invoice.business.logo && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <Logo src={invoice.business.logo} size={52} />
          </div>
        )}
        <div
          style={{
            fontFamily: SERIF,
            fontSize: '27px',
            fontWeight: 500,
            letterSpacing: '0.01em',
            color: INK,
          }}
        >
          {invoice.business.name || 'Your business'}
        </div>
        <div style={{ fontSize: '11.5px', color: MUTED, marginTop: '6px', whiteSpace: 'pre-line' }}>
          {[invoice.business.address?.replace(/\n/g, ' · '), invoice.business.email]
            .filter(Boolean)
            .join('  ·  ')}
        </div>
      </header>

      <div style={{ textAlign: 'center', margin: '30px 0 34px' }}>
        <div
          style={{
            fontFamily: SERIF,
            fontSize: '15px',
            fontStyle: 'italic',
            color: accent,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          Invoice
        </div>
        <div
          style={{
            fontFamily: SERIF,
            fontSize: '32px',
            fontWeight: 600,
            letterSpacing: '-0.01em',
            marginTop: '2px',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {invoice.number}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '48px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Label style={{ letterSpacing: '0.2em' }}>Prepared for</Label>
          <ContactBlock
            name={invoice.customer.name}
            company={invoice.customer.company}
            address={invoice.customer.billingAddress}
            email={invoice.customer.email}
            taxLabel="Tax ID"
            taxValue={invoice.customer.taxId}
          />
        </div>
        <div style={{ width: '200px', flexShrink: 0 }}>
          <Label style={{ letterSpacing: '0.2em' }}>Particulars</Label>
          {metaRows(invoice).map((row) => (
            <div
              key={row.label}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '12px',
                fontSize: '11.5px',
                color: MUTED,
                padding: '3px 0',
                borderBottom: `1px solid ${RULE}`,
              }}
            >
              <span>{row.label}</span>
              <span style={{ color: INK, fontVariantNumeric: 'tabular-nums' }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: '38px' }}>
        <ItemsTable invoice={invoice} totals={totals} accent={accent} head="minimal" />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '26px' }}>
        <TotalsBlock invoice={invoice} totals={totals} accent={accent} variant="rule" />
      </div>

      <FooterBlock invoice={invoice} accent={accent} />

      <div
        style={{
          marginTop: '28px',
          textAlign: 'center',
          fontFamily: SERIF,
          fontStyle: 'italic',
          fontSize: '12px',
          color: MUTED,
        }}
      >
        Thank you for working with us.
      </div>
    </div>
  );
}
