import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { CURRENCIES, getCurrency } from '@/constants/currencies';
import { useOnClickOutside } from '@/hooks/useOnClickOutside';
import { cn } from '@/lib/utils';

interface CurrencyPickerProps {
  value: string;
  onChange: (code: string) => void;
  label?: string;
}

/** Searchable combobox over the currency list, built to the ARIA listbox pattern. */
export function CurrencyPicker({ value, onChange, label = 'Currency' }: CurrencyPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const id = useId();

  const selected = getCurrency(value);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return CURRENCIES;
    return CURRENCIES.filter(
      (currency) =>
        currency.code.toLowerCase().includes(needle) ||
        currency.name.toLowerCase().includes(needle) ||
        currency.symbol.toLowerCase().includes(needle),
    );
  }, [query]);

  useOnClickOutside(containerRef, () => setOpen(false), open);

  useEffect(() => {
    if (!open) {
      setQuery('');
      return;
    }
    const index = Math.max(
      0,
      results.findIndex((currency) => currency.code === value),
    );
    setActiveIndex(index);
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
    // `results` is intentionally excluded: we only want this on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.children[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const commit = (code: string) => {
    onChange(code);
    setOpen(false);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, results.length - 1));
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const currency = results[activeIndex];
      if (currency) commit(currency.code);
    }
  };

  return (
    <div ref={containerRef} className="relative flex min-w-0 flex-col gap-1.5">
      <span id={`${id}-label`} className="text-[0.8125rem] font-semibold leading-none text-muted">
        {label}
      </span>

      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-labelledby={`${id}-label`}
        aria-haspopup="listbox"
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={cn(
          'flex h-10 w-full items-center gap-2 rounded-xl bg-sunken px-3.5 text-left text-sm',
          'ring-1 ring-inset ring-hairline transition-shadow duration-200',
          'hover:ring-faint/45 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
          open && 'bg-surface ring-2 ring-brand-500',
        )}
      >
        <span className="font-mono text-sm font-semibold text-brand-600 dark:text-brand-300">
          {selected.symbol}
        </span>
        <span className="min-w-0 flex-1 truncate font-medium text-fg">
          {selected.code}
          <span className="ml-2 font-normal text-faint">{selected.name}</span>
        </span>
        <ChevronsUpDown aria-hidden="true" className="h-4 w-4 shrink-0 text-faint" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.12 } }}
            transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
            className="absolute left-0 right-0 top-full z-40 mt-2 origin-top overflow-hidden rounded-2xl bg-surface shadow-pop ring-1 ring-hairline"
          >
            <div className="flex items-center gap-2 border-b border-hairline px-3.5 py-2.5">
              <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-faint" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={onKeyDown}
                placeholder={`Search ${CURRENCIES.length} currencies`}
                aria-label="Search currencies"
                aria-controls={`${id}-list`}
                aria-activedescendant={
                  results[activeIndex] ? `${id}-option-${results[activeIndex].code}` : undefined
                }
                className="w-full bg-transparent text-sm text-fg placeholder:text-faint focus:outline-none"
              />
            </div>

            <ul
              ref={listRef}
              id={`${id}-list`}
              role="listbox"
              aria-label="Currencies"
              className="max-h-64 overflow-y-auto p-1.5"
            >
              {results.map((currency, index) => {
                const active = index === activeIndex;
                const isSelected = currency.code === value;
                return (
                  <li key={currency.code}>
                    <button
                      type="button"
                      id={`${id}-option-${currency.code}`}
                      role="option"
                      aria-selected={isSelected}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => commit(currency.code)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors',
                        active ? 'bg-sunken' : 'bg-transparent',
                      )}
                    >
                      <span className="w-8 shrink-0 font-mono text-sm font-semibold text-brand-600 dark:text-brand-300">
                        {currency.symbol}
                      </span>
                      <span className="w-12 shrink-0 font-mono text-xs font-semibold text-fg">
                        {currency.code}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-muted">{currency.name}</span>
                      {isSelected && (
                        <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-500" />
                      )}
                    </button>
                  </li>
                );
              })}
              {results.length === 0 && (
                <li className="px-3 py-6 text-center text-sm text-faint">
                  No currency matches “{query}”
                </li>
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
