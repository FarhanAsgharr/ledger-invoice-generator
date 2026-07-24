import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { FileText, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Field';
import { Panel } from '@/components/ui/Panel';
import { CurrencyPicker } from '@/components/invoice/CurrencyPicker';
import { PAYMENT_TERMS, STATUSES } from '@/constants/invoice';
import { addDays, relativeDays } from '@/lib/format';
import { nextInvoiceNumber } from '@/lib/invoice-factory';
import { loadLastNumber } from '@/lib/storage';
import { cn } from '@/lib/utils';
import type { Invoice } from '@/types';

/** Step 03 — the invoice's own identity: number, dates, currency, status. */
export function DetailsSection() {
  const {
    register,
    control,
    setValue,
    formState: { errors },
  } = useFormContext<Invoice>();

  const number = useWatch({ control, name: 'number' });
  const issueDate = useWatch({ control, name: 'issueDate' });
  const dueDate = useWatch({ control, name: 'dueDate' });
  const status = useWatch({ control, name: 'status' });
  const terms = useWatch({ control, name: 'paymentTerms' });

  const regenerate = () => {
    setValue('number', nextInvoiceNumber(loadLastNumber() ?? number), { shouldDirty: true });
  };

  const applyTerms = (label: string) => {
    setValue('paymentTerms', label, { shouldDirty: true });
    const preset = PAYMENT_TERMS.find((item) => item.label === label);
    if (preset?.days != null && issueDate) {
      setValue('dueDate', addDays(issueDate, preset.days), {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  };

  const dueHint = dueDate ? relativeDays(dueDate) : '';
  const overdue = dueHint.includes('overdue');

  return (
    <Panel
      id="section-details"
      step={3}
      title="Invoice details"
      icon={<FileText />}
      summary={number ? `${number} · ${status}` : 'Not set yet'}
    >
      <div className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Invoice number"
            required
            className="font-mono"
            error={errors.number?.message}
            action={
              <Button
                size="sm"
                variant="ghost"
                onClick={regenerate}
                leftIcon={<RefreshCw className="h-3 w-3" />}
                className="-my-1 h-6 px-2 text-2xs"
              >
                Next in series
              </Button>
            }
            {...register('number')}
          />
          <Input
            label="Purchase order number"
            placeholder="PO-4417"
            hint="Add it when your customer requires a PO reference"
            error={errors.poNumber?.message}
            {...register('poNumber')}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Issue date"
            type="date"
            required
            error={errors.issueDate?.message}
            {...register('issueDate')}
          />
          <Input
            label="Due date"
            type="date"
            required
            error={errors.dueDate?.message}
            hint={
              dueHint ? (
                <span className={cn(overdue && 'font-semibold text-danger-400')}>{dueHint}</span>
              ) : undefined
            }
            {...register('dueDate')}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            control={control}
            name="currencyCode"
            render={({ field }) => <CurrencyPicker value={field.value} onChange={field.onChange} />}
          />

          <Select
            label="Status"
            hint="Paid, part paid, overdue and cancelled stamp the invoice"
            error={errors.status?.message}
            {...register('status')}
          >
            {STATUSES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[0.8125rem] font-semibold leading-none text-muted">
            Payment terms
          </span>
          <div className="flex flex-wrap gap-1.5">
            {PAYMENT_TERMS.filter((item) => item.label !== 'Custom').map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => applyTerms(item.label)}
                aria-pressed={terms === item.label}
                className={cn(
                  'rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all duration-200',
                  'ring-1 ring-inset',
                  terms === item.label
                    ? 'bg-brand-500/12 text-brand-700 ring-brand-500/40 dark:text-brand-300'
                    : 'bg-sunken text-muted ring-hairline hover:text-fg hover:ring-faint/50',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <Input
            aria-label="Custom payment terms"
            placeholder="Or write your own terms"
            className="mt-1"
            error={errors.paymentTerms?.message}
            {...register('paymentTerms')}
          />
        </div>
      </div>
    </Panel>
  );
}
