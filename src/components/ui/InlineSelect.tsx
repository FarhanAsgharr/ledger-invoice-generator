import { forwardRef } from 'react';
import type { SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface InlineSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Short text shown in the chip — a currency symbol, a `%`. */
  chipLabel: string;
  /** Which end of the field the chip sits at. */
  side?: 'left' | 'right';
}

/**
 * A compact select that lives *inside* a text field, as a prefix or suffix chip.
 *
 * The native `<select>` is stretched over the chip at zero opacity, so the
 * control keeps every native behaviour that matters — the OS picker on mobile,
 * type-ahead, form association, `register()` from react-hook-form — while the
 * chip beneath it carries the styling. Focus is mirrored onto the chip with
 * `peer-focus-visible`, so keyboard users still see where they are.
 *
 * Using this rather than a sibling `<select>` is also what keeps the field from
 * overflowing: the chip is positioned, not laid out, so it cannot add width to
 * a grid cell that has none to spare.
 */
export const InlineSelect = forwardRef<HTMLSelectElement, InlineSelectProps>(function InlineSelect(
  { chipLabel, side = 'left', className, children, ...rest },
  ref,
) {
  return (
    <span
      className={cn(
        'absolute inset-y-1 z-10 flex w-12 items-stretch',
        side === 'left' ? 'left-1' : 'right-1',
      )}
    >
      <select
        ref={ref}
        className={cn('peer absolute inset-0 z-10 w-full cursor-pointer opacity-0', className)}
        {...rest}
      >
        {children}
      </select>
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none flex w-full items-center justify-center gap-px rounded-md',
          'bg-hairline/70 font-mono text-[0.6875rem] font-semibold text-muted',
          'transition-colors duration-150',
          'peer-hover:bg-hairline peer-hover:text-fg',
          'peer-focus-visible:bg-brand-500/15 peer-focus-visible:text-brand-700',
          'dark:peer-focus-visible:text-brand-300',
        )}
      >
        <span className="truncate">{chipLabel}</span>
        <ChevronDown className="h-2.5 w-2.5 shrink-0 opacity-60" />
      </span>
    </span>
  );
});

/** Left padding a field needs to clear a prefix chip. */
export const INLINE_SELECT_PAD_LEFT = 'pl-14';
/** Right padding a field needs to clear a suffix chip. */
export const INLINE_SELECT_PAD_RIGHT = 'pr-14';
