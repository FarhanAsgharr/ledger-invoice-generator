import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { FieldShell } from '@/components/ui/Field';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { formatDate, parseISO, todayISO } from '@/lib/format';
import { cn } from '@/lib/utils';

/** Monday-first, to match the day-month-year format the invoice prints. */
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const YEAR_SPAN = 12;

/** Must outlast the closing transition below, or the panel vanishes mid-fade. */
const CLOSE_MS = 180;

export interface DatePickerProps {
  label: ReactNode;
  /** `yyyy-mm-dd`, or an empty string. */
  value: string;
  onChange: (value: string) => void;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  /** Earliest selectable date, `yyyy-mm-dd`. Earlier days are disabled. */
  min?: string;
  max?: string;
  clearable?: boolean;
  containerClassName?: string;
  id?: string;
}

function toISO(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

/** Monday = 0 … Sunday = 6. */
function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

function addMonths(date: Date, delta: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth() + delta, 1);
  return next;
}

/**
 * A calendar field.
 *
 * The text input is read-only on purpose: every date this app stores is
 * `yyyy-mm-dd`, and free-typed dates are ambiguous across regions (03/12 is two
 * different days either side of the Atlantic). The calendar is the single way in,
 * and it is fully keyboard-operable — arrows move a day, PageUp/PageDown move a
 * month, Shift with them moves a year, Enter selects, Escape closes.
 */
export function DatePicker({
  label,
  value,
  onChange,
  hint,
  error,
  required,
  min,
  max,
  clearable = true,
  containerClassName,
  id,
}: DatePickerProps) {
  const generated = useId();
  const fieldId = id ?? generated;
  const dialogId = `${fieldId}-calendar`;

  const [open, setOpen] = useState(false);
  /**
   * Presence is driven by hand rather than by AnimatePresence.
   *
   * AnimatePresence ran the exit animation to opacity 0 but never removed the
   * node, leaving an invisible `z-95` panel over the page that still swallowed
   * clicks. `mounted` controls the DOM, `visible` controls the transition, and
   * the close timer guarantees removal. The global `prefers-reduced-motion`
   * rule collapses these durations to nothing, so behaviour is unchanged for
   * anyone who asked for less motion.
   */
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const selected = parseISO(value);
  const isCompact = useMediaQuery('(max-width: 639px)');

  /** Month currently on screen. */
  const [viewDate, setViewDate] = useState<Date>(() => selected ?? new Date());
  /** Day the keyboard is on — always inside the visible month. */
  const [cursor, setCursor] = useState<string>(() => value || todayISO());

  // Re-centre the calendar whenever it opens on a different value.
  useEffect(() => {
    if (!open) return;
    const anchor = parseISO(value) ?? new Date();
    setViewDate(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
    setCursor(value || todayISO());
  }, [open, value]);

  // Not `useOnClickOutside`: on small screens the panel is portalled to
  // <body>, so it is not a DOM descendant of the field and would count as
  // "outside". Both regions are checked explicitly instead.
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [open]);

  useEffect(() => {
    if (open) {
      setMounted(true);
      // Paint once in the closed state so the opening transition has somewhere
      // to travel from.
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    }
    setVisible(false);
    const timer = setTimeout(() => setMounted(false), CLOSE_MS);
    return () => clearTimeout(timer);
  }, [open]);

  const isDisabled = useCallback(
    (iso: string) => (min ? iso < min : false) || (max ? iso > max : false),
    [min, max],
  );

  const commit = useCallback(
    (iso: string) => {
      if (isDisabled(iso)) return;
      onChange(iso);
      setOpen(false);
      triggerRef.current?.focus();
    },
    [isDisabled, onChange],
  );

  /** Six weeks of days, so the popup never changes height between months. */
  const weeks = useMemo(() => {
    const firstOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const start = new Date(firstOfMonth);
    start.setDate(start.getDate() - mondayIndex(firstOfMonth));

    return Array.from({ length: 6 }, (_, week) =>
      Array.from({ length: 7 }, (_, day) => {
        const date = new Date(start);
        date.setDate(start.getDate() + week * 7 + day);
        return date;
      }),
    );
  }, [viewDate]);

  const years = useMemo(() => {
    const base = new Date().getFullYear();
    const list: number[] = [];
    for (let year = base - YEAR_SPAN; year <= base + YEAR_SPAN; year += 1) list.push(year);
    const selectedYear = selected?.getFullYear();
    if (selectedYear && !list.includes(selectedYear)) {
      list.push(selectedYear);
      list.sort((a, b) => a - b);
    }
    return list;
  }, [selected]);

  /** Keep the cursor's month on screen as the keyboard walks off the edges. */
  const moveCursor = useCallback((iso: string) => {
    setCursor(iso);
    const date = parseISO(iso);
    if (date) setViewDate(new Date(date.getFullYear(), date.getMonth(), 1));
  }, []);

  const shiftCursor = useCallback(
    (deltaDays: number, deltaMonths = 0, deltaYears = 0) => {
      const from = parseISO(cursor) ?? new Date();
      const next = new Date(from.getFullYear() + deltaYears, from.getMonth() + deltaMonths, 1);
      // Clamp to the target month's length before applying the day delta.
      const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
      next.setDate(Math.min(from.getDate(), lastDay));
      next.setDate(next.getDate() + deltaDays);
      moveCursor(toISO(next));
    },
    [cursor, moveCursor],
  );

  const onGridKeyDown = (event: React.KeyboardEvent) => {
    const keys: Record<string, () => void> = {
      ArrowLeft: () => shiftCursor(-1),
      ArrowRight: () => shiftCursor(1),
      ArrowUp: () => shiftCursor(-7),
      ArrowDown: () => shiftCursor(7),
      PageUp: () => shiftCursor(0, event.shiftKey ? 0 : -1, event.shiftKey ? -1 : 0),
      PageDown: () => shiftCursor(0, event.shiftKey ? 0 : 1, event.shiftKey ? 1 : 0),
      Home: () => {
        const date = parseISO(cursor);
        if (!date) return;
        date.setDate(date.getDate() - mondayIndex(date));
        moveCursor(toISO(date));
      },
      End: () => {
        const date = parseISO(cursor);
        if (!date) return;
        date.setDate(date.getDate() + (6 - mondayIndex(date)));
        moveCursor(toISO(date));
      },
      Enter: () => commit(cursor),
      ' ': () => commit(cursor),
      Escape: () => {
        setOpen(false);
        triggerRef.current?.focus();
      },
    };

    const handler = keys[event.key];
    if (!handler) return;
    event.preventDefault();
    event.stopPropagation();
    handler();
  };

  // Move DOM focus onto the cursor day so screen readers follow along.
  useEffect(() => {
    if (!open) return;
    const node = gridRef.current?.querySelector<HTMLButtonElement>(`[data-iso="${cursor}"]`);
    node?.focus({ preventScroll: true });
  }, [open, cursor]);

  const today = todayISO();
  const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined;

  const panel = (
    <div
      ref={panelRef}
      id={dialogId}
      role="dialog"
      aria-modal={isCompact || undefined}
      aria-label={`Choose a date${typeof label === 'string' ? ` for ${label.toLowerCase()}` : ''}`}
      className={cn(
        'z-[95] overflow-hidden rounded-2xl bg-surface p-3 shadow-pop ring-1 ring-hairline',
        'transition-[opacity,transform] duration-200 ease-swift',
        isCompact
          ? 'fixed inset-x-3 bottom-3 origin-bottom'
          : 'absolute left-0 top-full mt-2 w-[19.5rem] origin-top',
        visible
          ? 'translate-y-0 scale-100 opacity-100'
          : cn(
              'pointer-events-none opacity-0',
              isCompact ? 'translate-y-6 scale-100' : '-translate-y-2 scale-[0.97]',
            ),
      )}
    >
      {/* Month navigation */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setViewDate((d) => addMonths(d, -1))}
          aria-label="Previous month"
          className="rounded-lg p-1.5 text-muted transition-colors hover:bg-sunken hover:text-fg"
        >
          <ChevronLeft aria-hidden="true" className="h-4 w-4" />
        </button>

        <div className="flex flex-1 items-center gap-1.5">
          <label className="sr-only" htmlFor={`${fieldId}-month`}>
            Month
          </label>
          <select
            id={`${fieldId}-month`}
            value={viewDate.getMonth()}
            onChange={(event) =>
              setViewDate(new Date(viewDate.getFullYear(), Number(event.target.value), 1))
            }
            className="min-w-0 flex-1 cursor-pointer rounded-lg bg-sunken px-2 py-1.5 text-[0.8125rem] font-semibold text-fg ring-1 ring-inset ring-hairline transition-colors hover:ring-faint/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            {MONTHS.map((month, index) => (
              <option key={month} value={index}>
                {month}
              </option>
            ))}
          </select>

          <label className="sr-only" htmlFor={`${fieldId}-year`}>
            Year
          </label>
          <select
            id={`${fieldId}-year`}
            value={viewDate.getFullYear()}
            onChange={(event) =>
              setViewDate(new Date(Number(event.target.value), viewDate.getMonth(), 1))
            }
            className="w-[4.5rem] shrink-0 cursor-pointer rounded-lg bg-sunken px-2 py-1.5 text-[0.8125rem] font-semibold tabular text-fg ring-1 ring-inset ring-hairline transition-colors hover:ring-faint/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => setViewDate((d) => addMonths(d, 1))}
          aria-label="Next month"
          className="rounded-lg p-1.5 text-muted transition-colors hover:bg-sunken hover:text-fg"
        >
          <ChevronRight aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>

      {/* Weekday header */}
      <div className="mt-3 grid grid-cols-7 gap-0.5">
        {WEEKDAYS.map((day) => (
          <abbr
            key={day}
            title={day}
            className="py-1 text-center text-2xs font-semibold uppercase tracking-wide text-faint no-underline"
          >
            {day.slice(0, 2)}
          </abbr>
        ))}
      </div>

      {/* Days */}
      <div
        ref={gridRef}
        role="grid"
        aria-label={`${MONTHS[viewDate.getMonth()]} ${viewDate.getFullYear()}`}
        onKeyDown={onGridKeyDown}
        className="mt-0.5 grid grid-cols-7 gap-0.5"
      >
        {weeks.flat().map((date) => {
          const iso = toISO(date);
          const inMonth = date.getMonth() === viewDate.getMonth();
          const isSelected = iso === value;
          const isToday = iso === today;
          const disabled = isDisabled(iso);

          return (
            <button
              key={iso}
              type="button"
              role="gridcell"
              data-iso={iso}
              disabled={disabled}
              tabIndex={iso === cursor ? 0 : -1}
              aria-selected={isSelected}
              aria-current={isToday ? 'date' : undefined}
              aria-label={formatDate(iso)}
              onClick={() => commit(iso)}
              className={cn(
                'relative h-9 rounded-lg text-[0.8125rem] font-medium tabular',
                'transition-[background-color,color,transform] duration-150',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                'disabled:pointer-events-none disabled:opacity-25',
                isSelected
                  ? 'grad-brand font-bold text-white shadow-[0_2px_8px_-2px_rgb(14_124_102/0.6)]'
                  : inMonth
                    ? 'text-fg hover:bg-brand-500/12 hover:text-brand-700 dark:hover:text-brand-300'
                    : 'text-faint/60 hover:bg-sunken',
                !isSelected && 'active:scale-95',
              )}
            >
              {date.getDate()}
              {isToday && !isSelected && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-1 mx-auto h-1 w-1 rounded-full bg-brand-500"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Shortcuts */}
      <div className="mt-3 flex items-center gap-2 border-t border-hairline pt-3">
        <button
          type="button"
          onClick={() => commit(today)}
          disabled={isDisabled(today)}
          className="rounded-lg bg-sunken px-2.5 py-1.5 text-xs font-semibold text-fg ring-1 ring-inset ring-hairline transition-colors hover:ring-faint/50 disabled:pointer-events-none disabled:opacity-40"
        >
          Today
        </button>
        <span className="flex-1 text-center text-2xs text-faint">
          {value ? formatDate(value) : 'No date set'}
        </span>
        {clearable && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              setOpen(false);
              triggerRef.current?.focus();
            }}
            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted transition-colors hover:bg-danger-400/10 hover:text-danger-400"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className={cn('relative', containerClassName)}>
      <FieldShell id={fieldId} label={label} hint={hint} error={error} required={required}>
        <div className="relative flex items-center">
          <CalendarDays
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute left-3 h-4 w-4 transition-colors duration-200',
              open ? 'text-brand-500' : 'text-faint',
            )}
          />
          <input
            ref={triggerRef}
            id={fieldId}
            type="text"
            readOnly
            role="combobox"
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-controls={open ? dialogId : undefined}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            value={value ? formatDate(value) : ''}
            placeholder="Pick a date"
            onClick={() => setOpen((current) => !current)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setOpen(true);
              }
              if (event.key === 'Escape') setOpen(false);
            }}
            className={cn(
              'h-10 w-full cursor-pointer rounded-xl bg-sunken pl-9 pr-9 text-sm text-fg',
              'placeholder:text-faint/80 ring-1 ring-inset ring-hairline',
              'transition-[box-shadow,background-color] duration-200',
              'hover:ring-faint/45 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand-500',
              open && 'bg-surface ring-2 ring-brand-500',
              error && 'ring-danger-400 hover:ring-danger-400 focus:ring-danger-400',
            )}
          />
          {clearable && value && (
            <button
              type="button"
              onClick={() => onChange('')}
              aria-label={`Clear ${typeof label === 'string' ? label.toLowerCase() : 'date'}`}
              className="absolute right-2 rounded-md p-1 text-faint transition-colors hover:bg-hairline hover:text-fg"
            >
              <X aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </FieldShell>

      {mounted &&
        (isCompact
          ? /*
             * Portalled to <body> on small screens.
             *
             * `position: fixed` resolves against the nearest *transformed*
             * ancestor, not the viewport — and the workspace's entrance
             * animation leaves an identity `transform` on a wrapper, which
             * parked the sheet 4,000 px down the page. A portal is the only
             * reliable escape from that containing block.
             */
            createPortal(
              <>
                /* On phones the calendar is a sheet, so it never runs off-screen. */
                <div
                  onClick={() => setOpen(false)}
                  aria-hidden="true"
                  className={cn(
                    'fixed inset-0 z-[90] bg-ink-950/45 backdrop-blur-[2px]',
                    'transition-opacity duration-200 ease-swift',
                    visible ? 'opacity-100' : 'opacity-0',
                  )}
                />
                <div
                  ref={panelRef}
                  id={dialogId}
                  role="dialog"
                  aria-modal={isCompact || undefined}
                  aria-label={`Choose a date${typeof label === 'string' ? ` for ${label.toLowerCase()}` : ''}`}
                  className={cn(
                    'z-[95] overflow-hidden rounded-2xl bg-surface p-3 shadow-pop ring-1 ring-hairline',
                    'transition-[opacity,transform] duration-200 ease-swift',
                    isCompact
                      ? 'fixed inset-x-3 bottom-3 origin-bottom'
                      : 'absolute left-0 top-full mt-2 w-[19.5rem] origin-top',
                    visible
                      ? 'translate-y-0 scale-100 opacity-100'
                      : cn(
                          'pointer-events-none opacity-0',
                          isCompact ? 'translate-y-6 scale-100' : '-translate-y-2 scale-[0.97]',
                        ),
                  )}
                >
                  {/* Month navigation */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setViewDate((d) => addMonths(d, -1))}
                      aria-label="Previous month"
                      className="rounded-lg p-1.5 text-muted transition-colors hover:bg-sunken hover:text-fg"
                    >
                      <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                    </button>

                    <div className="flex flex-1 items-center gap-1.5">
                      <label className="sr-only" htmlFor={`${fieldId}-month`}>
                        Month
                      </label>
                      <select
                        id={`${fieldId}-month`}
                        value={viewDate.getMonth()}
                        onChange={(event) =>
                          setViewDate(
                            new Date(viewDate.getFullYear(), Number(event.target.value), 1),
                          )
                        }
                        className="min-w-0 flex-1 cursor-pointer rounded-lg bg-sunken px-2 py-1.5 text-[0.8125rem] font-semibold text-fg ring-1 ring-inset ring-hairline transition-colors hover:ring-faint/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                      >
                        {MONTHS.map((month, index) => (
                          <option key={month} value={index}>
                            {month}
                          </option>
                        ))}
                      </select>

                      <label className="sr-only" htmlFor={`${fieldId}-year`}>
                        Year
                      </label>
                      <select
                        id={`${fieldId}-year`}
                        value={viewDate.getFullYear()}
                        onChange={(event) =>
                          setViewDate(new Date(Number(event.target.value), viewDate.getMonth(), 1))
                        }
                        className="w-[4.5rem] shrink-0 cursor-pointer rounded-lg bg-sunken px-2 py-1.5 text-[0.8125rem] font-semibold tabular text-fg ring-1 ring-inset ring-hairline transition-colors hover:ring-faint/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                      >
                        {years.map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => setViewDate((d) => addMonths(d, 1))}
                      aria-label="Next month"
                      className="rounded-lg p-1.5 text-muted transition-colors hover:bg-sunken hover:text-fg"
                    >
                      <ChevronRight aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Weekday header */}
                  <div className="mt-3 grid grid-cols-7 gap-0.5">
                    {WEEKDAYS.map((day) => (
                      <abbr
                        key={day}
                        title={day}
                        className="py-1 text-center text-2xs font-semibold uppercase tracking-wide text-faint no-underline"
                      >
                        {day.slice(0, 2)}
                      </abbr>
                    ))}
                  </div>

                  {/* Days */}
                  <div
                    ref={gridRef}
                    role="grid"
                    aria-label={`${MONTHS[viewDate.getMonth()]} ${viewDate.getFullYear()}`}
                    onKeyDown={onGridKeyDown}
                    className="mt-0.5 grid grid-cols-7 gap-0.5"
                  >
                    {weeks.flat().map((date) => {
                      const iso = toISO(date);
                      const inMonth = date.getMonth() === viewDate.getMonth();
                      const isSelected = iso === value;
                      const isToday = iso === today;
                      const disabled = isDisabled(iso);

                      return (
                        <button
                          key={iso}
                          type="button"
                          role="gridcell"
                          data-iso={iso}
                          disabled={disabled}
                          tabIndex={iso === cursor ? 0 : -1}
                          aria-selected={isSelected}
                          aria-current={isToday ? 'date' : undefined}
                          aria-label={formatDate(iso)}
                          onClick={() => commit(iso)}
                          className={cn(
                            'relative h-9 rounded-lg text-[0.8125rem] font-medium tabular',
                            'transition-[background-color,color,transform] duration-150',
                            'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                            'disabled:pointer-events-none disabled:opacity-25',
                            isSelected
                              ? 'grad-brand font-bold text-white shadow-[0_2px_8px_-2px_rgb(14_124_102/0.6)]'
                              : inMonth
                                ? 'text-fg hover:bg-brand-500/12 hover:text-brand-700 dark:hover:text-brand-300'
                                : 'text-faint/60 hover:bg-sunken',
                            !isSelected && 'active:scale-95',
                          )}
                        >
                          {date.getDate()}
                          {isToday && !isSelected && (
                            <span
                              aria-hidden="true"
                              className="absolute inset-x-0 bottom-1 mx-auto h-1 w-1 rounded-full bg-brand-500"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Shortcuts */}
                  <div className="mt-3 flex items-center gap-2 border-t border-hairline pt-3">
                    <button
                      type="button"
                      onClick={() => commit(today)}
                      disabled={isDisabled(today)}
                      className="rounded-lg bg-sunken px-2.5 py-1.5 text-xs font-semibold text-fg ring-1 ring-inset ring-hairline transition-colors hover:ring-faint/50 disabled:pointer-events-none disabled:opacity-40"
                    >
                      Today
                    </button>
                    <span className="flex-1 text-center text-2xs text-faint">
                      {value ? formatDate(value) : 'No date set'}
                    </span>
                    {clearable && (
                      <button
                        type="button"
                        onClick={() => {
                          onChange('');
                          setOpen(false);
                          triggerRef.current?.focus();
                        }}
                        className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted transition-colors hover:bg-danger-400/10 hover:text-danger-400"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </>,
              document.body,
            )
          : panel)}
    </div>
  );
}
