import { z } from 'zod';

/**
 * Validation rules for the invoice form.
 *
 * Deliberately permissive about presentation fields (notes, terms, template) and
 * strict about the handful that make an invoice usable: who is billing whom,
 * for what, by when.
 *
 * Messages are written to be actionable — they say what to do, not what failed.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Number inputs hand back `NaN` when cleared, which would otherwise surface as
 * "cannot be negative". Normalise the empty cases first so the message matches
 * what the person actually did.
 */
function numberField(options: { message: string; min?: number; max?: number; maxMessage?: string }) {
  return z.preprocess(
    (value) => {
      if (value === '' || value === null || value === undefined) return undefined;
      if (typeof value === 'number' && Number.isNaN(value)) return undefined;
      return value;
    },
    z.coerce
      .number({ required_error: options.message, invalid_type_error: options.message })
      .refine(Number.isFinite, { message: options.message })
      .refine((value) => options.min === undefined || value >= options.min, {
        message: options.message,
      })
      .refine((value) => options.max === undefined || value <= options.max, {
        message: options.maxMessage ?? options.message,
      }),
  );
}

const optionalEmail = z
  .string()
  .trim()
  .max(320)
  .refine((value) => value === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), {
    message: 'Enter a complete email address, like name@company.com',
  });

const discountSchema = z.object({
  kind: z.enum(['percentage', 'fixed']),
  value: numberField({ message: 'Enter a discount of zero or more', min: 0 }),
});

const lineItemSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1, 'Name this item so your customer knows what they are paying for'),
  description: z.string().max(1000),
  quantity: numberField({
    message: 'Enter a quantity of zero or more',
    min: 0,
    max: 1_000_000,
    maxMessage: 'That quantity is too large',
  }),
  unitPrice: numberField({
    message: 'Enter a unit price of zero or more',
    min: 0,
    max: 1_000_000_000,
    maxMessage: 'That unit price is too large',
  }),
  taxRate: numberField({
    message: 'Enter a tax rate between 0 and 100',
    min: 0,
    max: 100,
    maxMessage: 'Tax cannot exceed 100%',
  }),
  discount: discountSchema,
});

const taxRuleSchema = z.object({
  id: z.string(),
  label: z.string().trim().min(1, 'Give this tax a name, e.g. VAT'),
  kind: z.enum(['percentage', 'fixed']),
  value: numberField({ message: 'Enter a rate of zero or more', min: 0 }),
  compound: z.boolean(),
  enabled: z.boolean(),
});

const chargeSchema = z.object({
  id: z.string(),
  label: z.string().trim().max(80),
  amount: numberField({ message: 'Enter an amount' }),
});

export const invoiceSchema = z
  .object({
    id: z.string(),
    number: z
      .string()
      .trim()
      .min(1, 'Every invoice needs a number')
      .max(60, 'Keep the number under 60 characters'),
    issueDate: z.string().regex(ISO_DATE, 'Choose an issue date'),
    dueDate: z.string().regex(ISO_DATE, 'Choose a due date'),
    currencyCode: z.string().min(3).max(8),
    status: z.enum(['draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled']),
    paymentTerms: z.string().max(120),
    poNumber: z.string().max(60),

    business: z.object({
      name: z.string().trim().min(1, 'Add your business name — it appears at the top of the invoice'),
      logo: z.string().nullable(),
      logoIsLight: z.boolean(),
      address: z.string().max(600),
      phone: z.string().max(40),
      email: optionalEmail,
      website: z.string().max(300),
      taxNumber: z.string().max(80),
      registrationNumber: z.string().max(80),
    }),

    customer: z.object({
      name: z.string().trim().min(1, 'Add who this invoice is for'),
      company: z.string().max(160),
      billingAddress: z.string().max(600),
      shippingAddress: z.string().max(600),
      shipToBilling: z.boolean(),
      phone: z.string().max(40),
      email: optionalEmail,
      taxId: z.string().max(80),
    }),

    items: z.array(lineItemSchema).min(1, 'Add at least one item before saving this invoice'),
    perItemTax: z.boolean(),
    taxes: z.array(taxRuleSchema),
    discount: discountSchema,
    shipping: numberField({ message: 'Enter a shipping cost of zero or more', min: 0 }),
    additionalCharges: z.array(chargeSchema),

    notes: z.string().max(2000),
    terms: z.string().max(4000),

    template: z.enum([
      'modern',
      'minimal',
      'corporate',
      'elegant',
      'classic',
      'professional',
      'creative',
    ]),
    accent: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Pick a colour'),

    createdAt: z.number(),
    updatedAt: z.number(),
  })
  .superRefine((invoice, ctx) => {
    if (ISO_DATE.test(invoice.issueDate) && ISO_DATE.test(invoice.dueDate)) {
      if (invoice.dueDate < invoice.issueDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['dueDate'],
          message: 'The due date falls before the issue date',
        });
      }
    }
    if (invoice.discount.kind === 'percentage' && invoice.discount.value > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['discount', 'value'],
        message: 'A percentage discount cannot exceed 100%',
      });
    }
    invoice.items.forEach((item, index) => {
      if (item.discount.kind === 'percentage' && item.discount.value > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['items', index, 'discount', 'value'],
          message: 'A percentage discount cannot exceed 100%',
        });
      }
    });
  });

export type InvoiceFormValues = z.infer<typeof invoiceSchema>;
