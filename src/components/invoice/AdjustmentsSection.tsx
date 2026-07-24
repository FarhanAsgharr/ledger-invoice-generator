import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { Percent, Plus, Receipt, Trash2, Truck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Field';
import { Panel } from '@/components/ui/Panel';
import { Switch } from '@/components/ui/Switch';
import { Tooltip } from '@/components/ui/Tooltip';
import { TAX_PRESETS } from '@/constants/invoice';
import { getCurrency } from '@/constants/currencies';
import { createCharge, createTaxRule } from '@/lib/invoice-factory';
import { cn } from '@/lib/utils';
import type { Invoice } from '@/types';

/** Step 05 — taxes, discounts, shipping and anything else on the ladder. */
export function AdjustmentsSection() {
  const { register, control, setValue } = useFormContext<Invoice>();

  const taxes = useFieldArray({ control, name: 'taxes' });
  const charges = useFieldArray({ control, name: 'additionalCharges' });

  const currencyCode = useWatch({ control, name: 'currencyCode' });
  const discountKind = useWatch({ control, name: 'discount.kind' });
  const taxValues = useWatch({ control, name: 'taxes' });
  const currency = getCurrency(currencyCode);

  const enabledCount = (taxValues ?? []).filter((tax) => tax?.enabled).length;

  return (
    <Panel
      id="section-adjustments"
      step={5}
      title="Taxes & adjustments"
      icon={<Percent />}
      summary={`${enabledCount} ${enabledCount === 1 ? 'tax' : 'taxes'} applied`}
    >
      <div className="space-y-6">
        {/* ── Taxes ─────────────────────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold tracking-[-0.01em] text-fg">Taxes</h3>
            <Button
              size="sm"
              variant="subtle"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => taxes.append(createTaxRule({ label: '', value: 0 }))}
            >
              Add tax
            </Button>
          </div>

          {taxes.fields.length === 0 ? (
            <p className="rounded-xl bg-sunken px-4 py-6 text-center text-sm text-faint ring-1 ring-inset ring-hairline">
              No taxes on this invoice. Add one if you charge VAT, GST or sales tax.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {taxes.fields.map((field, index) => {
                const kind = taxValues?.[index]?.kind ?? 'percentage';
                const enabled = taxValues?.[index]?.enabled ?? true;
                return (
                  <li
                    key={field.id}
                    className={cn(
                      'rounded-2xl bg-sunken p-3 ring-1 ring-inset ring-hairline transition-opacity',
                      !enabled && 'opacity-55',
                    )}
                  >
                    <div className="flex flex-wrap items-end gap-2">
                      <Input
                        containerClassName="min-w-[8rem] flex-1"
                        label="Name"
                        placeholder="VAT"
                        className="h-9"
                        {...register(`taxes.${index}.label`)}
                      />
                      <Input
                        containerClassName="w-24"
                        label="Rate"
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="any"
                        className="h-9"
                        suffix={kind === 'percentage' ? '%' : currency.symbol}
                        {...register(`taxes.${index}.value`, { valueAsNumber: true })}
                      />
                      <Select
                        containerClassName="w-28"
                        label="Type"
                        className="h-9"
                        {...register(`taxes.${index}.kind`)}
                      >
                        <option value="percentage">Percentage</option>
                        <option value="fixed">Fixed</option>
                      </Select>
                      <Tooltip label="Remove tax">
                        <button
                          type="button"
                          onClick={() => taxes.remove(index)}
                          aria-label={`Remove tax ${index + 1}`}
                          className="mb-0.5 rounded-lg p-2 text-faint transition-colors hover:bg-danger-400/10 hover:text-danger-400"
                        >
                          <Trash2 aria-hidden="true" className="h-4 w-4" />
                        </button>
                      </Tooltip>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-hairline pt-3">
                      <Switch
                        checked={enabled}
                        onChange={(checked) =>
                          setValue(`taxes.${index}.enabled`, checked, { shouldDirty: true })
                        }
                        label="Apply"
                        className="[&_label]:text-xs"
                      />
                      {kind === 'percentage' && (
                        <Switch
                          checked={taxValues?.[index]?.compound ?? false}
                          onChange={(checked) =>
                            setValue(`taxes.${index}.compound`, checked, { shouldDirty: true })
                          }
                          label="Compound"
                          description="Charge this on the taxes above it"
                          className="[&_label]:text-xs"
                        />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="flex flex-wrap gap-1.5">
            <span className="self-center text-2xs font-semibold uppercase tracking-wider text-faint">
              Presets
            </span>
            {TAX_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() =>
                  taxes.append(createTaxRule({ label: preset.label, value: preset.value }))
                }
                className="rounded-lg bg-sunken px-2.5 py-1 text-xs font-semibold text-muted ring-1 ring-inset ring-hairline transition-colors hover:text-fg hover:ring-faint/50"
              >
                {preset.label} {preset.value}%
              </button>
            ))}
          </div>
        </div>

        {/* ── Invoice discount ──────────────────────────────────────────── */}
        <div className="space-y-3 border-t border-hairline pt-6">
          <h3 className="text-sm font-bold tracking-[-0.01em] text-fg">Invoice discount</h3>
          <p className="text-xs text-faint">
            Applied after any per-line discounts, before tax is calculated.
          </p>
          <div className="flex items-end gap-2">
            <Input
              containerClassName="w-32"
              label="Amount"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              suffix={discountKind === 'percentage' ? '%' : currency.symbol}
              {...register('discount.value', { valueAsNumber: true })}
            />
            <Select containerClassName="w-40" label="Type" {...register('discount.kind')}>
              <option value="percentage">Percentage</option>
              <option value="fixed">Flat amount</option>
            </Select>
          </div>
        </div>

        {/* ── Shipping and extras ───────────────────────────────────────── */}
        <div className="space-y-3 border-t border-hairline pt-6">
          <h3 className="flex items-center gap-2 text-sm font-bold tracking-[-0.01em] text-fg">
            <Truck aria-hidden="true" className="h-4 w-4 text-muted" />
            Shipping & extra charges
          </h3>

          <Input
            containerClassName="w-40"
            label="Shipping"
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            prefix={currency.symbol}
            {...register('shipping', { valueAsNumber: true })}
          />

          {charges.fields.length > 0 && (
            <ul className="space-y-2">
              {charges.fields.map((field, index) => (
                <li key={field.id} className="flex items-end gap-2">
                  <Input
                    containerClassName="flex-1"
                    label={index === 0 ? 'Charge' : undefined}
                    placeholder="Rush fee"
                    className="h-9"
                    {...register(`additionalCharges.${index}.label`)}
                  />
                  <Input
                    containerClassName="w-32"
                    label={index === 0 ? 'Amount' : undefined}
                    type="number"
                    inputMode="decimal"
                    step="any"
                    className="h-9"
                    prefix={currency.symbol}
                    {...register(`additionalCharges.${index}.amount`, { valueAsNumber: true })}
                  />
                  <Tooltip label="Remove charge">
                    <button
                      type="button"
                      onClick={() => charges.remove(index)}
                      aria-label={`Remove charge ${index + 1}`}
                      className="mb-0.5 rounded-lg p-2 text-faint transition-colors hover:bg-danger-400/10 hover:text-danger-400"
                    >
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </Tooltip>
                </li>
              ))}
            </ul>
          )}

          <Button
            variant="outline"
            size="sm"
            leftIcon={<Receipt className="h-3.5 w-3.5" />}
            onClick={() => charges.append(createCharge())}
          >
            Add another charge
          </Button>
        </div>
      </div>
    </Panel>
  );
}
