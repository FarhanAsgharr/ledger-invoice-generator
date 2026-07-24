import { memo, useId } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { ChevronDown, ChevronUp, Copy, GripVertical, Trash2 } from 'lucide-react';
import { Tooltip } from '@/components/ui/Tooltip';
import { getCurrency } from '@/constants/currencies';
import { calculateLine } from '@/lib/calc';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Invoice } from '@/types';

interface ItemRowProps {
  index: number;
  total: number;
  currencyCode: string;
  perItemTax: boolean;
  isDragging: boolean;
  isDragTarget: boolean;
  onDuplicate: (index: number) => void;
  onRemove: (index: number) => void;
  onMove: (from: number, to: number) => void;
  onDragStart: (index: number) => void;
  onDragEnter: (index: number) => void;
  onDragEnd: () => void;
  productListId: string;
}

const CELL =
  'h-9 w-full rounded-lg bg-sunken px-2.5 text-sm text-fg tabular ring-1 ring-inset ring-hairline ' +
  'transition-shadow duration-150 hover:ring-faint/45 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand-500';

const MICRO_LABEL = 'mb-1 block text-2xs font-semibold uppercase tracking-wider text-faint';

/**
 * One billable line, laid out as a card rather than a table row.
 *
 * A seven-column table cannot survive a 600 px editor column or a phone; the
 * card keeps every field — name, description, quantity, unit price, tax,
 * discount and total — at a usable size on every screen.
 */
export const ItemRow = memo(function ItemRow({
  index,
  total,
  currencyCode,
  perItemTax,
  isDragging,
  isDragTarget,
  onDuplicate,
  onRemove,
  onMove,
  onDragStart,
  onDragEnter,
  onDragEnd,
  productListId,
}: ItemRowProps) {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<Invoice>();
  const rowId = useId();

  const item = useWatch({ control, name: `items.${index}` });
  const currency = getCurrency(currencyCode);

  const lineTotals = item
    ? calculateLine(item, { perItemTax, decimals: currency.decimals })
    : { gross: 0, discount: 0, net: 0, tax: 0, total: 0 };

  const itemErrors = errors.items?.[index];

  return (
    <li
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move';
        // Firefox requires data to be set before a drag will start.
        event.dataTransfer.setData('text/plain', String(index));
        onDragStart(index);
      }}
      onDragEnter={() => onDragEnter(index)}
      onDragOver={(event) => event.preventDefault()}
      onDragEnd={onDragEnd}
      onDrop={(event) => {
        event.preventDefault();
        onDragEnd();
      }}
      aria-label={`Item ${index + 1}${item?.name ? `: ${item.name}` : ''}`}
      className={cn(
        'group relative rounded-2xl bg-surface p-3 ring-1 ring-inset ring-hairline',
        'transition-[box-shadow,transform,opacity] duration-200 ease-swift',
        'hover:shadow-card',
        isDragging && 'opacity-40',
        isDragTarget && 'ring-2 ring-brand-500',
      )}
    >
      <div className="flex items-start gap-2">
        {/* Handle: drag for pointer users, buttons below for everyone else. */}
        <span
          aria-hidden="true"
          className="mt-2 hidden cursor-grab text-faint transition-colors group-hover:text-muted active:cursor-grabbing sm:block"
        >
          <GripVertical className="h-4 w-4" />
        </span>

        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <label htmlFor={`${rowId}-name`} className="sr-only">
                Item name
              </label>
              <input
                id={`${rowId}-name`}
                list={productListId}
                placeholder="What are you billing for?"
                autoComplete="off"
                className={cn(CELL, 'font-semibold', itemErrors?.name && 'ring-danger-400')}
                aria-invalid={itemErrors?.name ? true : undefined}
                {...register(`items.${index}.name`)}
              />
            </div>

            <div className="w-24 shrink-0 text-right sm:w-32">
              <span className={cn(MICRO_LABEL, 'text-right')}>Total</span>
              <output
                aria-label={`Line total for item ${index + 1}`}
                className="block truncate font-mono text-sm font-semibold tabular text-fg"
              >
                {formatMoney(lineTotals.total, currencyCode)}
              </output>
            </div>
          </div>

          {itemErrors?.name?.message && (
            <p role="alert" className="text-xs font-medium text-danger-400">
              {itemErrors.name.message}
            </p>
          )}

          <div>
            <label htmlFor={`${rowId}-description`} className="sr-only">
              Description
            </label>
            <textarea
              id={`${rowId}-description`}
              rows={1}
              placeholder="Add a description (optional)"
              className={cn(CELL, 'h-auto min-h-[2.25rem] resize-y py-2 text-[0.8125rem]')}
              {...register(`items.${index}.description`)}
            />
          </div>

          <div
            className={cn(
              'grid gap-2',
              perItemTax ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3',
            )}
          >
            <div>
              <label htmlFor={`${rowId}-qty`} className={MICRO_LABEL}>
                Qty
              </label>
              <input
                id={`${rowId}-qty`}
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                className={cn(CELL, itemErrors?.quantity && 'ring-danger-400')}
                aria-invalid={itemErrors?.quantity ? true : undefined}
                {...register(`items.${index}.quantity`, { valueAsNumber: true })}
              />
            </div>

            <div>
              <label htmlFor={`${rowId}-price`} className={MICRO_LABEL}>
                Unit price
              </label>
              <div className="relative">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-xs text-faint"
                >
                  {currency.symbol}
                </span>
                <input
                  id={`${rowId}-price`}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  className={cn(CELL, 'pl-7', itemErrors?.unitPrice && 'ring-danger-400')}
                  aria-invalid={itemErrors?.unitPrice ? true : undefined}
                  {...register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                />
              </div>
            </div>

            {perItemTax && (
              <div>
                <label htmlFor={`${rowId}-tax`} className={MICRO_LABEL}>
                  Tax %
                </label>
                <div className="relative">
                  <input
                    id={`${rowId}-tax`}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={100}
                    step="any"
                    className={cn(CELL, 'pr-6')}
                    {...register(`items.${index}.taxRate`, { valueAsNumber: true })}
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-xs text-faint"
                  >
                    %
                  </span>
                </div>
              </div>
            )}

            <div>
              <label htmlFor={`${rowId}-discount`} className={MICRO_LABEL}>
                Discount
              </label>
              <div className="flex gap-1">
                <input
                  id={`${rowId}-discount`}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  className={cn(CELL, 'flex-1')}
                  {...register(`items.${index}.discount.value`, { valueAsNumber: true })}
                />
                <label htmlFor={`${rowId}-discount-kind`} className="sr-only">
                  Discount type for item {index + 1}
                </label>
                <select
                  id={`${rowId}-discount-kind`}
                  className={cn(CELL, 'w-11 shrink-0 cursor-pointer px-0 text-center font-mono text-xs')}
                  {...register(`items.${index}.discount.kind`)}
                >
                  <option value="percentage">%</option>
                  <option value="fixed">{currency.symbol}</option>
                </select>
              </div>
            </div>
          </div>

          {lineTotals.discount > 0 && (
            <p className="text-2xs text-faint">
              {formatMoney(lineTotals.gross, currencyCode)} less{' '}
              {formatMoney(lineTotals.discount, currencyCode)} discount
              {perItemTax && lineTotals.tax > 0
                ? `, plus ${formatMoney(lineTotals.tax, currencyCode)} tax`
                : ''}
            </p>
          )}
        </div>
      </div>

      {/* Row actions. Always reachable by keyboard; revealed on hover for pointers. */}
      <div className="mt-2 flex items-center justify-end gap-0.5 border-t border-hairline pt-2 sm:mt-0 sm:border-0 sm:pt-0 sm:opacity-0 sm:transition-opacity sm:duration-200 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
        <Tooltip label="Move up">
          <button
            type="button"
            onClick={() => onMove(index, index - 1)}
            disabled={index === 0}
            aria-label={`Move item ${index + 1} up`}
            className="rounded-lg p-1.5 text-faint transition-colors hover:bg-sunken hover:text-fg disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronUp aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
        <Tooltip label="Move down">
          <button
            type="button"
            onClick={() => onMove(index, index + 1)}
            disabled={index === total - 1}
            aria-label={`Move item ${index + 1} down`}
            className="rounded-lg p-1.5 text-faint transition-colors hover:bg-sunken hover:text-fg disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
        <Tooltip label="Duplicate">
          <button
            type="button"
            onClick={() => onDuplicate(index)}
            aria-label={`Duplicate item ${index + 1}`}
            className="rounded-lg p-1.5 text-faint transition-colors hover:bg-sunken hover:text-fg"
          >
            <Copy aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
        <Tooltip label="Delete">
          <button
            type="button"
            onClick={() => onRemove(index)}
            disabled={total === 1}
            aria-label={`Delete item ${index + 1}`}
            className="rounded-lg p-1.5 text-faint transition-colors hover:bg-danger-400/10 hover:text-danger-400 disabled:pointer-events-none disabled:opacity-30"
          >
            <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
      </div>
    </li>
  );
});
