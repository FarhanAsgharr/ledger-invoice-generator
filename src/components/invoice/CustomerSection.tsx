import { useEffect } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { Mail, Phone, UserRound } from 'lucide-react';
import { Input, Textarea } from '@/components/ui/Field';
import { Panel } from '@/components/ui/Panel';
import { Switch } from '@/components/ui/Switch';
import type { Invoice } from '@/types';

/** Step 02 — who is being billed. */
export function CustomerSection() {
  const {
    register,
    control,
    setValue,
    formState: { errors },
  } = useFormContext<Invoice>();

  const name = useWatch({ control, name: 'customer.name' });
  const company = useWatch({ control, name: 'customer.company' });
  const shipToBilling = useWatch({ control, name: 'customer.shipToBilling' });
  const billingAddress = useWatch({ control, name: 'customer.billingAddress' });

  // While "same as billing" is on, keep shipping mirrored so the preview and the
  // exported PDF never disagree with the checkbox.
  useEffect(() => {
    if (shipToBilling) {
      setValue('customer.shippingAddress', billingAddress ?? '', { shouldDirty: false });
    }
  }, [shipToBilling, billingAddress, setValue]);

  return (
    <Panel
      id="section-customer"
      step={2}
      title="Bill to"
      icon={<UserRound />}
      summary={[name, company].filter(Boolean).join(' · ') || 'Not set yet'}
    >
      <div className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Customer name"
            required
            placeholder="Priya Raghunathan"
            autoComplete="name"
            error={errors.customer?.name?.message}
            {...register('customer.name')}
          />
          <Input
            label="Company"
            placeholder="Halcyon Foods Ltd"
            autoComplete="organization"
            error={errors.customer?.company?.message}
            {...register('customer.company')}
          />
        </div>

        <Textarea
          label="Billing address"
          rows={4}
          placeholder={'9 Copperworks Road\nLeeds LS11 9TG\nUnited Kingdom'}
          error={errors.customer?.billingAddress?.message}
          {...register('customer.billingAddress')}
        />

        <div className="rounded-2xl bg-sunken p-4 ring-1 ring-inset ring-hairline">
          <Switch
            checked={Boolean(shipToBilling)}
            onChange={(checked) => setValue('customer.shipToBilling', checked, { shouldDirty: true })}
            label="Ship to the billing address"
            description="Turn this off to show a separate delivery address on the invoice."
          />

          {!shipToBilling && (
            <div className="mt-4 animate-fade-up">
              <Textarea
                label="Shipping address"
                rows={3}
                placeholder={'Unit 4, Dock Road\nHull HU9 1PN'}
                error={errors.customer?.shippingAddress?.message}
                {...register('customer.shippingAddress')}
              />
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Phone"
            type="tel"
            icon={<Phone />}
            placeholder="+44 113 210 0072"
            error={errors.customer?.phone?.message}
            {...register('customer.phone')}
          />
          <Input
            label="Email"
            type="email"
            icon={<Mail />}
            placeholder="accounts@halcyonfoods.co.uk"
            error={errors.customer?.email?.message}
            {...register('customer.email')}
          />
        </div>

        <Input
          label="Tax ID"
          hint="Shown on the invoice for reverse-charge and B2B filings"
          placeholder="GB 288 4471 09"
          error={errors.customer?.taxId?.message}
          {...register('customer.taxId')}
        />
      </div>
    </Panel>
  );
}
