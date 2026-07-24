import { useCallback, useId, useState } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { ListPlus, Plus, Table2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { Switch } from '@/components/ui/Switch';
import { ItemRow } from '@/components/invoice/ItemRow';
import { useArchive } from '@/context/ArchiveContext';
import { useToast } from '@/context/ToastContext';
import { createLineItem } from '@/lib/invoice-factory';
import { uid } from '@/lib/utils';
import type { Invoice } from '@/types';

/** Step 04 — the billable lines. */
export function ItemsSection() {
  const { control, setValue, formState } = useFormContext<Invoice>();
  const { fields, append, remove, move, insert } = useFieldArray({ control, name: 'items' });
  const { products } = useArchive();
  const toast = useToast();
  const productListId = useId();

  const currencyCode = useWatch({ control, name: 'currencyCode' });
  const perItemTax = useWatch({ control, name: 'perItemTax' });
  const items = useWatch({ control, name: 'items' });

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const addItem = useCallback(() => {
    append(createLineItem());
  }, [append]);

  const duplicateItem = useCallback(
    (index: number) => {
      const source = items?.[index];
      if (!source) return;
      insert(index + 1, { ...source, id: uid('item') });
      toast.success('Item duplicated');
    },
    [items, insert, toast],
  );

  const removeItem = useCallback(
    (index: number) => {
      if (fields.length === 1) return;
      remove(index);
      toast.info('Item deleted');
    },
    [fields.length, remove, toast],
  );

  const moveItem = useCallback(
    (from: number, to: number) => {
      if (to < 0 || to >= fields.length || from === to) return;
      move(from, to);
    },
    [fields.length, move],
  );

  const onDragEnd = useCallback(() => {
    if (dragIndex !== null && overIndex !== null && dragIndex !== overIndex) {
      move(dragIndex, overIndex);
    }
    setDragIndex(null);
    setOverIndex(null);
  }, [dragIndex, overIndex, move]);

  const itemsError = formState.errors.items;
  const rootMessage = Array.isArray(itemsError) ? undefined : itemsError?.message;

  return (
    <Panel
      id="section-items"
      step={4}
      title="Items"
      icon={<Table2 />}
      summary={`${fields.length} ${fields.length === 1 ? 'line' : 'lines'}`}
      action={
        <Button size="sm" variant="subtle" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={addItem}>
          Add item
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl bg-sunken px-4 py-3 ring-1 ring-inset ring-hairline">
          <Switch
            checked={Boolean(perItemTax)}
            onChange={(checked) => setValue('perItemTax', checked, { shouldDirty: true })}
            label="Tax each line separately"
            description="Turn this on when items are taxed at different rates. Invoice-wide taxes still apply."
          />
        </div>

        {rootMessage && (
          <p role="alert" className="text-sm font-medium text-danger-400">
            {rootMessage}
          </p>
        )}

        <ul className="space-y-2.5">
          {fields.map((field, index) => (
            <ItemRow
              key={field.id}
              index={index}
              total={fields.length}
              currencyCode={currencyCode}
              perItemTax={Boolean(perItemTax)}
              isDragging={dragIndex === index}
              isDragTarget={overIndex === index && dragIndex !== null && dragIndex !== index}
              onDuplicate={duplicateItem}
              onRemove={removeItem}
              onMove={moveItem}
              onDragStart={setDragIndex}
              onDragEnter={setOverIndex}
              onDragEnd={onDragEnd}
              productListId={productListId}
              onCurrencyChange={(code) =>
                setValue('currencyCode', code, { shouldDirty: true, shouldValidate: true })
              }
            />
          ))}
        </ul>

        {/* Names billed before, offered as native autocomplete on every row. */}
        <datalist id={productListId}>
          {products.slice(0, 60).map((product) => (
            <option key={product.name} value={product.name}>
              {product.description || `${product.uses} past invoices`}
            </option>
          ))}
        </datalist>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" leftIcon={<Plus className="h-4 w-4" />} onClick={addItem}>
            Add item
          </Button>
          {products.length > 0 && (
            <Button
              variant="ghost"
              leftIcon={<ListPlus className="h-4 w-4" />}
              onClick={() => {
                const product = products[0];
                append(
                  createLineItem({
                    name: product.name,
                    description: product.description,
                    unitPrice: product.unitPrice,
                    taxRate: product.taxRate,
                  }),
                );
                toast.success('Added from your history', product.name);
              }}
            >
              Add “{products[0].name}”
            </Button>
          )}
          <p className="ml-auto text-xs text-faint">
            Drag a card, or use the arrows, to reorder lines.
          </p>
        </div>
      </div>
    </Panel>
  );
}
