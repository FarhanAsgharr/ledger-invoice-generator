import { DEFAULT_CURRENCY, getCurrency } from '@/constants/currencies';
import { DEFAULT_NOTES, DEFAULT_TERMS } from '@/constants/invoice';
import { TEMPLATE_MAP, TEMPLATES } from '@/constants/templates';
import { addDays, todayISO } from '@/lib/format';
import { isRasterImageDataUrl, safeHexColor, sanitizeText } from '@/lib/sanitize';
import { isRecord, toNumber, uid } from '@/lib/utils';
import type {
  AdditionalCharge,
  Business,
  Customer,
  Discount,
  Invoice,
  InvoiceStatus,
  LineItem,
  TaxRule,
  TemplateId,
  ValueKind,
} from '@/types';

const STATUS_VALUES: InvoiceStatus[] = ['draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled'];
const KIND_VALUES: ValueKind[] = ['percentage', 'fixed'];

export function createLineItem(overrides: Partial<LineItem> = {}): LineItem {
  return {
    id: uid('item'),
    name: '',
    description: '',
    quantity: 1,
    unitPrice: 0,
    taxRate: 0,
    discount: { kind: 'percentage', value: 0 },
    ...overrides,
  };
}

export function createTaxRule(overrides: Partial<TaxRule> = {}): TaxRule {
  return {
    id: uid('tax'),
    label: 'VAT',
    kind: 'percentage',
    value: 20,
    compound: false,
    enabled: true,
    ...overrides,
  };
}

export function createCharge(overrides: Partial<AdditionalCharge> = {}): AdditionalCharge {
  return { id: uid('chg'), label: '', amount: 0, ...overrides };
}

/**
 * Next number in the `PREFIX-YYYY-NNNN` series, based on whatever the user last
 * used. Falls back to a fresh series when nothing parseable is stored.
 */
export function nextInvoiceNumber(previous?: string | null): string {
  const year = new Date().getFullYear();
  const match = /^([A-Za-z][A-Za-z-]*)-(\d{4})-(\d+)$/.exec((previous ?? '').trim());
  if (match) {
    const [, prefix, seriesYear, counter] = match;
    const width = counter.length;
    if (Number(seriesYear) === year) {
      return `${prefix}-${year}-${String(Number(counter) + 1).padStart(width, '0')}`;
    }
    return `${prefix}-${year}-${'1'.padStart(width, '0')}`;
  }
  // Trailing-digits fallback: "2043" → "2044", "ACME/07" → "ACME/08".
  const tail = /^(.*?)(\d+)$/.exec((previous ?? '').trim());
  if (tail) {
    const [, head, counter] = tail;
    return `${head}${String(Number(counter) + 1).padStart(counter.length, '0')}`;
  }
  return `INV-${year}-0001`;
}

export function createEmptyInvoice(overrides: Partial<Invoice> = {}): Invoice {
  const now = Date.now();
  const issueDate = todayISO();
  return {
    id: uid('inv'),
    number: nextInvoiceNumber(),
    issueDate,
    dueDate: addDays(issueDate, 14),
    currencyCode: DEFAULT_CURRENCY.code,
    status: 'draft',
    paymentTerms: 'Net 14',
    poNumber: '',

    business: {
      name: '',
      logo: null,
      logoIsLight: false,
      address: '',
      phone: '',
      email: '',
      website: '',
      taxNumber: '',
      registrationNumber: '',
    },
    customer: {
      name: '',
      company: '',
      billingAddress: '',
      shippingAddress: '',
      shipToBilling: true,
      phone: '',
      email: '',
      taxId: '',
    },

    items: [createLineItem()],
    perItemTax: false,
    taxes: [createTaxRule()],
    discount: { kind: 'percentage', value: 0 },
    shipping: 0,
    additionalCharges: [],

    notes: DEFAULT_NOTES,
    terms: DEFAULT_TERMS,

    template: 'modern',
    accent: TEMPLATES[0].defaultAccent,

    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * A worked example so the first-run screen shows a real invoice instead of an
 * empty grid. Users clear it with one click.
 */
export function createSampleInvoice(): Invoice {
  const base = createEmptyInvoice();
  return {
    ...base,
    business: {
      name: 'Northwind Studio',
      logo: null,
      logoIsLight: false,
      address: '14 Rivet Lane\nUnit 3\nManchester M1 4BT\nUnited Kingdom',
      phone: '+44 161 496 0140',
      email: 'billing@northwind.studio',
      website: 'northwind.studio',
      taxNumber: 'GB 412 8837 21',
      registrationNumber: '09482217',
    },
    customer: {
      name: 'Priya Raghunathan',
      company: 'Halcyon Foods Ltd',
      billingAddress: '9 Copperworks Road\nLeeds LS11 9TG\nUnited Kingdom',
      shippingAddress: '9 Copperworks Road\nLeeds LS11 9TG\nUnited Kingdom',
      shipToBilling: true,
      phone: '+44 113 210 0072',
      email: 'accounts@halcyonfoods.co.uk',
      taxId: 'GB 288 4471 09',
    },
    currencyCode: 'GBP',
    poNumber: 'PO-4417',
    items: [
      createLineItem({
        name: 'Brand identity system',
        description: 'Wordmark, colour, type scale and a 32-page usage manual.',
        quantity: 1,
        unitPrice: 6800,
      }),
      createLineItem({
        name: 'Packaging artwork',
        description: 'Six SKUs, print-ready with dielines.',
        quantity: 6,
        unitPrice: 420,
        discount: { kind: 'percentage', value: 10 },
      }),
      createLineItem({
        name: 'Art direction',
        description: 'On-set direction for the launch photography.',
        quantity: 12,
        unitPrice: 95,
      }),
    ],
    taxes: [createTaxRule({ label: 'VAT', value: 20 })],
    shipping: 0,
    notes: 'Bank transfer to Northwind Studio · Sort 04-00-75 · Acct 8827 4410',
  };
}

/* ── Normalisation ───────────────────────────────────────────────────────── */

function pickString(source: Record<string, unknown>, key: string, fallback = '', max = 5000): string {
  return sanitizeText(source[key], max) || fallback;
}

function normalizeDiscount(value: unknown): Discount {
  if (!isRecord(value)) return { kind: 'percentage', value: 0 };
  const kind = KIND_VALUES.includes(value.kind as ValueKind) ? (value.kind as ValueKind) : 'percentage';
  return { kind, value: Math.max(0, toNumber(value.value)) };
}

function normalizeBusiness(value: unknown): Business {
  const source = isRecord(value) ? value : {};
  return {
    name: pickString(source, 'name', '', 160),
    logo: isRasterImageDataUrl(source.logo) ? source.logo : null,
    logoIsLight: source.logoIsLight === true,
    address: pickString(source, 'address', '', 600),
    phone: pickString(source, 'phone', '', 40),
    email: pickString(source, 'email', '', 320),
    website: pickString(source, 'website', '', 300),
    taxNumber: pickString(source, 'taxNumber', '', 80),
    registrationNumber: pickString(source, 'registrationNumber', '', 80),
  };
}

function normalizeCustomer(value: unknown): Customer {
  const source = isRecord(value) ? value : {};
  return {
    name: pickString(source, 'name', '', 160),
    company: pickString(source, 'company', '', 160),
    billingAddress: pickString(source, 'billingAddress', '', 600),
    shippingAddress: pickString(source, 'shippingAddress', '', 600),
    shipToBilling: source.shipToBilling !== false,
    phone: pickString(source, 'phone', '', 40),
    email: pickString(source, 'email', '', 320),
    taxId: pickString(source, 'taxId', '', 80),
  };
}

function normalizeItem(value: unknown): LineItem {
  const source = isRecord(value) ? value : {};
  return {
    id: sanitizeText(source.id, 64) || uid('item'),
    name: pickString(source, 'name', '', 200),
    description: pickString(source, 'description', '', 1000),
    quantity: Math.max(0, toNumber(source.quantity, 1)),
    unitPrice: Math.max(0, toNumber(source.unitPrice)),
    taxRate: Math.max(0, toNumber(source.taxRate)),
    discount: normalizeDiscount(source.discount),
  };
}

function normalizeTax(value: unknown): TaxRule {
  const source = isRecord(value) ? value : {};
  const kind = KIND_VALUES.includes(source.kind as ValueKind) ? (source.kind as ValueKind) : 'percentage';
  return {
    id: sanitizeText(source.id, 64) || uid('tax'),
    label: pickString(source, 'label', 'Tax', 60),
    kind,
    value: Math.max(0, toNumber(source.value)),
    compound: source.compound === true,
    enabled: source.enabled !== false,
  };
}

function normalizeCharge(value: unknown): AdditionalCharge {
  const source = isRecord(value) ? value : {};
  return {
    id: sanitizeText(source.id, 64) || uid('chg'),
    label: pickString(source, 'label', '', 80),
    amount: toNumber(source.amount),
  };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Turn an untrusted blob — restored from localStorage or dropped in as JSON —
 * into a fully-formed `Invoice`. Every field is coerced or replaced; nothing is
 * trusted, and no exception escapes.
 */
export function normalizeInvoice(value: unknown): Invoice {
  const base = createEmptyInvoice();
  if (!isRecord(value)) return base;

  const template = TEMPLATE_MAP.has(value.template as TemplateId)
    ? (value.template as TemplateId)
    : base.template;

  const items = Array.isArray(value.items) ? value.items.map(normalizeItem).slice(0, 500) : [];

  const issueDate = ISO_DATE.test(String(value.issueDate)) ? String(value.issueDate) : base.issueDate;
  const dueDate = ISO_DATE.test(String(value.dueDate)) ? String(value.dueDate) : addDays(issueDate, 14);

  return {
    id: sanitizeText(value.id, 64) || base.id,
    number: pickString(value, 'number', base.number, 60),
    issueDate,
    dueDate,
    currencyCode: getCurrency(sanitizeText(value.currencyCode, 8)).code,
    status: STATUS_VALUES.includes(value.status as InvoiceStatus)
      ? (value.status as InvoiceStatus)
      : 'draft',
    paymentTerms: pickString(value, 'paymentTerms', base.paymentTerms, 120),
    poNumber: pickString(value, 'poNumber', '', 60),

    business: normalizeBusiness(value.business),
    customer: normalizeCustomer(value.customer),

    items: items.length > 0 ? items : [createLineItem()],
    perItemTax: value.perItemTax === true,
    taxes: Array.isArray(value.taxes) ? value.taxes.map(normalizeTax).slice(0, 20) : [],
    discount: normalizeDiscount(value.discount),
    shipping: Math.max(0, toNumber(value.shipping)),
    additionalCharges: Array.isArray(value.additionalCharges)
      ? value.additionalCharges.map(normalizeCharge).slice(0, 20)
      : [],

    notes: pickString(value, 'notes', '', 2000),
    terms: pickString(value, 'terms', '', 4000),

    template,
    accent: safeHexColor(value.accent, TEMPLATE_MAP.get(template)?.defaultAccent),

    createdAt: toNumber(value.createdAt, base.createdAt),
    updatedAt: toNumber(value.updatedAt, base.updatedAt),
  };
}

/** Deep copy for "duplicate": new ids everywhere, dates reset to today. */
export function duplicateInvoice(invoice: Invoice, number?: string): Invoice {
  const issueDate = todayISO();
  return {
    ...normalizeInvoice(invoice),
    id: uid('inv'),
    number: number ?? nextInvoiceNumber(invoice.number),
    issueDate,
    dueDate: addDays(issueDate, 14),
    status: 'draft',
    items: invoice.items.map((item) => ({ ...item, id: uid('item') })),
    taxes: invoice.taxes.map((tax) => ({ ...tax, id: uid('tax') })),
    additionalCharges: invoice.additionalCharges.map((charge) => ({ ...charge, id: uid('chg') })),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
