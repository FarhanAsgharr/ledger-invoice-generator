/**
 * Ledger — domain types.
 *
 * Everything the app knows about an invoice lives in the `Invoice` shape below.
 * It is the single serialisable unit: what autosave writes, what history stores,
 * what the templates render and what the PDF exporter rasterises.
 */

export type ThemeMode = 'light' | 'dark';

/* ── Money ───────────────────────────────────────────────────────────────── */

export interface Currency {
  /** ISO 4217 code, e.g. "USD". */
  code: string;
  name: string;
  symbol: string;
  /** Minor-unit digits. JPY is 0, most are 2, KWD is 3. */
  decimals: number;
  /** BCP 47 tag used for `Intl.NumberFormat` grouping and separators. */
  locale: string;
  /** Where the symbol sits when we format manually (Intl handles it normally). */
  position: 'prefix' | 'suffix';
}

/* ── Taxes and discounts ─────────────────────────────────────────────────── */

export type ValueKind = 'percentage' | 'fixed';

/** An invoice-level tax. Multiple rules stack; compound rules tax the taxes. */
export interface TaxRule {
  id: string;
  /** Free text — "VAT", "GST 18%", "State sales tax". */
  label: string;
  kind: ValueKind;
  value: number;
  /** When true this rule is applied on top of the running tax total. */
  compound: boolean;
  enabled: boolean;
}

export interface Discount {
  kind: ValueKind;
  value: number;
}

/* ── Line items ──────────────────────────────────────────────────────────── */

export interface LineItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  /** Per-line tax percentage. Ignored when `perItemTax` is off. */
  taxRate: number;
  discount: Discount;
}

/** An ad-hoc line on the totals ladder — packaging, rush fee, installation. */
export interface AdditionalCharge {
  id: string;
  label: string;
  amount: number;
}

/* ── Parties ─────────────────────────────────────────────────────────────── */

export interface Business {
  name: string;
  /** Data URL produced by the logo cropper. Never a remote URL. */
  logo: string | null;
  /**
   * True when the logo artwork is predominantly light. Templates with a
   * coloured header use it to decide whether to put a white plate behind the
   * logo — a white-on-transparent logo must not sit on a white plate.
   */
  logoIsLight: boolean;
  address: string;
  phone: string;
  email: string;
  website: string;
  taxNumber: string;
  registrationNumber: string;
}

export interface Customer {
  name: string;
  company: string;
  billingAddress: string;
  shippingAddress: string;
  /** Mirrors billing into shipping while true. */
  shipToBilling: boolean;
  phone: string;
  email: string;
  taxId: string;
}

/* ── Invoice ─────────────────────────────────────────────────────────────── */

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled';

export type TemplateId =
  | 'modern'
  | 'minimal'
  | 'corporate'
  | 'elegant'
  | 'classic'
  | 'professional'
  | 'creative';

export interface Invoice {
  /** Stable internal id; survives invoice-number edits. */
  id: string;
  number: string;
  issueDate: string; // yyyy-mm-dd
  dueDate: string; // yyyy-mm-dd
  currencyCode: string;
  status: InvoiceStatus;
  paymentTerms: string;
  poNumber: string;

  business: Business;
  customer: Customer;

  items: LineItem[];
  /** When true, each line carries its own tax rate and invoice taxes still stack. */
  perItemTax: boolean;
  taxes: TaxRule[];
  discount: Discount;
  shipping: number;
  additionalCharges: AdditionalCharge[];

  notes: string;
  terms: string;

  template: TemplateId;
  /** Hex accent applied to whichever template is active. */
  accent: string;

  createdAt: number;
  updatedAt: number;
}

/* ── Derived values ──────────────────────────────────────────────────────── */

export interface LineTotals {
  /** quantity × unitPrice, before any discount. */
  gross: number;
  discount: number;
  /** gross − discount. */
  net: number;
  tax: number;
  /** net + tax — what the "Total" column shows. */
  total: number;
}

export interface TaxBreakdownEntry {
  id: string;
  label: string;
  /** Rendered rate, e.g. "18%" or a formatted fixed amount. */
  rateLabel: string;
  amount: number;
}

export interface InvoiceTotals {
  /** Sum of every line's gross. */
  subtotal: number;
  /** Sum of every line's discount. */
  itemDiscount: number;
  /** Invoice-level discount, computed after line discounts. */
  invoiceDiscount: number;
  /** subtotal − itemDiscount − invoiceDiscount. What tax is charged on. */
  taxableBase: number;
  taxBreakdown: TaxBreakdownEntry[];
  taxTotal: number;
  shipping: number;
  additionalCharges: number;
  grandTotal: number;
  /** Per-line totals, index-aligned with `invoice.items`. */
  lines: LineTotals[];
}

/* ── Persistence ─────────────────────────────────────────────────────────── */

export interface StoredInvoice {
  invoice: Invoice;
  /** Cached so history cards can show an amount without recomputing. */
  grandTotal: number;
  savedAt: number;
}

/* ── UI ──────────────────────────────────────────────────────────────────── */

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  duration?: number;
}

export type EditorPane = 'edit' | 'preview';
