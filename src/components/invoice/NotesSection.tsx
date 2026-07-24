import { useFormContext, useWatch } from 'react-hook-form';
import { StickyNote } from 'lucide-react';
import { Textarea } from '@/components/ui/Field';
import { Panel } from '@/components/ui/Panel';
import { DEFAULT_TERMS } from '@/constants/invoice';
import { Button } from '@/components/ui/Button';
import type { Invoice } from '@/types';

/** Step 06 — the closing words: how to pay, and on what terms. */
export function NotesSection() {
  const {
    register,
    control,
    setValue,
    formState: { errors },
  } = useFormContext<Invoice>();

  const notes = useWatch({ control, name: 'notes' });
  const terms = useWatch({ control, name: 'terms' });

  return (
    <Panel
      id="section-notes"
      step={6}
      title="Notes & terms"
      icon={<StickyNote />}
      summary={notes ? notes.slice(0, 60) : 'Not set yet'}
      defaultOpen={false}
    >
      <div className="grid gap-4">
        <Textarea
          label="Notes"
          rows={3}
          placeholder="Bank transfer to Northwind Studio · Sort 04-00-75 · Acct 8827 4410"
          hint="Payment instructions go here. They print directly under the totals."
          error={errors.notes?.message}
          {...register('notes')}
        />

        <Textarea
          label="Terms & conditions"
          rows={5}
          placeholder="Payment is due by the date shown above…"
          error={errors.terms?.message}
          action={
            !terms && (
              <Button
                size="sm"
                variant="ghost"
                className="-my-1 h-6 px-2 text-2xs"
                onClick={() => setValue('terms', DEFAULT_TERMS, { shouldDirty: true })}
              >
                Use standard terms
              </Button>
            )
          }
          {...register('terms')}
        />
      </div>
    </Panel>
  );
}
