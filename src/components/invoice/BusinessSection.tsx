import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { Building2, Globe, Mail, Phone } from 'lucide-react';
import { Input, Textarea } from '@/components/ui/Field';
import { Panel } from '@/components/ui/Panel';
import { LogoUploader } from '@/components/invoice/LogoUploader';
import type { Invoice } from '@/types';

/** Step 01 — who is sending the invoice. */
export function BusinessSection() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<Invoice>();

  const name = useWatch({ control, name: 'business.name' });

  return (
    <Panel
      id="section-business"
      step={1}
      title="Your business"
      icon={<Building2 />}
      summary={name || 'Not set yet'}
    >
      <div className="grid gap-4">
        <Controller
          control={control}
          name="business.logo"
          render={({ field }) => <LogoUploader value={field.value} onChange={field.onChange} />}
        />

        <Input
          label="Business name"
          required
          placeholder="Northwind Studio"
          autoComplete="organization"
          error={errors.business?.name?.message}
          {...register('business.name')}
        />

        <Textarea
          label="Address"
          rows={4}
          placeholder={'14 Rivet Lane\nManchester M1 4BT\nUnited Kingdom'}
          autoComplete="street-address"
          error={errors.business?.address?.message}
          {...register('business.address')}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Phone"
            type="tel"
            icon={<Phone />}
            placeholder="+44 161 496 0140"
            autoComplete="tel"
            error={errors.business?.phone?.message}
            {...register('business.phone')}
          />
          <Input
            label="Email"
            type="email"
            icon={<Mail />}
            placeholder="billing@northwind.studio"
            autoComplete="email"
            error={errors.business?.email?.message}
            {...register('business.email')}
          />
        </div>

        <Input
          label="Website"
          icon={<Globe />}
          placeholder="northwind.studio"
          autoComplete="url"
          error={errors.business?.website?.message}
          {...register('business.website')}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Tax number"
            hint="VAT, GST or sales-tax registration"
            placeholder="GB 412 8837 21"
            error={errors.business?.taxNumber?.message}
            {...register('business.taxNumber')}
          />
          <Input
            label="Registration number"
            hint="Company or trade-licence number"
            placeholder="09482217"
            error={errors.business?.registrationNumber?.message}
            {...register('business.registrationNumber')}
          />
        </div>
      </div>
    </Panel>
  );
}
