import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Command,
  CornerDownLeft,
  FilePlus2,
  Package,
  Printer,
  Save,
  Search,
  Sun,
  UserRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useArchive } from '@/context/ArchiveContext';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Customer, Invoice } from '@/types';

export interface PaletteActions {
  newInvoice: () => void;
  save: () => void;
  print: () => void;
  downloadPdf: () => void;
  toggleTheme: () => void;
  openInvoice: (invoice: Invoice) => void;
  applyCustomer: (customer: Customer) => void;
  addProduct: (product: { name: string; description: string; unitPrice: number; taxRate: number }) => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  actions: PaletteActions;
}

interface Row {
  id: string;
  group: string;
  title: string;
  subtitle?: string;
  meta?: string;
  icon: LucideIcon;
  run: () => void;
}

/**
 * ⌘K search across everything the app knows: past invoices, the customers and
 * products derived from them, and the commands on the toolbar.
 */
export function CommandPalette({ open, onClose, actions }: CommandPaletteProps) {
  const { history, customers, products } = useArchive();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setActiveIndex(0);
      return undefined;
    }
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const rows = useMemo<Row[]>(() => {
    const needle = query.trim().toLowerCase();
    const matches = (...values: (string | undefined)[]) =>
      !needle || values.filter(Boolean).join(' ').toLowerCase().includes(needle);

    const commands: Row[] = [
      {
        id: 'cmd-new',
        group: 'Commands',
        title: 'Start a new invoice',
        icon: FilePlus2,
        meta: '⌘⇧N',
        run: actions.newInvoice,
      },
      { id: 'cmd-save', group: 'Commands', title: 'Save this invoice', icon: Save, meta: '⌘S', run: actions.save },
      {
        id: 'cmd-pdf',
        group: 'Commands',
        title: 'Download as PDF',
        icon: Package,
        meta: '⌘D',
        run: actions.downloadPdf,
      },
      { id: 'cmd-print', group: 'Commands', title: 'Print', icon: Printer, meta: '⌘P', run: actions.print },
      { id: 'cmd-theme', group: 'Commands', title: 'Switch light and dark', icon: Sun, run: actions.toggleTheme },
    ].filter((row) => matches(row.title));

    const invoiceRows: Row[] = history.entries
      .filter((entry) =>
        matches(
          entry.invoice.number,
          entry.invoice.customer.name,
          entry.invoice.customer.company,
          entry.invoice.poNumber,
        ),
      )
      .slice(0, 6)
      .map((entry) => ({
        id: `inv-${entry.invoice.id}`,
        group: 'Saved invoices',
        title: entry.invoice.number,
        subtitle: entry.invoice.customer.company || entry.invoice.customer.name || 'No customer',
        meta: formatMoney(entry.grandTotal, entry.invoice.currencyCode),
        icon: Search,
        run: () => actions.openInvoice(entry.invoice),
      }));

    const customerRows: Row[] = customers
      .filter((customer) => matches(customer.name, customer.company, customer.email))
      .slice(0, 5)
      .map((customer, index) => ({
        id: `cus-${index}-${customer.name}`,
        group: 'Customers',
        title: customer.company || customer.name,
        subtitle: customer.company ? customer.name : customer.email,
        meta: `${customer.uses} ${customer.uses === 1 ? 'invoice' : 'invoices'}`,
        icon: UserRound,
        run: () => actions.applyCustomer(customer),
      }));

    const productRows: Row[] = products
      .filter((product) => matches(product.name, product.description))
      .slice(0, 5)
      .map((product) => ({
        id: `prd-${product.name}`,
        group: 'Products',
        title: product.name,
        subtitle: product.description || undefined,
        meta: `${product.uses} ${product.uses === 1 ? 'use' : 'uses'}`,
        icon: Package,
        run: () => actions.addProduct(product),
      }));

    return [...commands, ...invoiceRows, ...customerRows, ...productRows];
  }, [query, history.entries, customers, products, actions]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % Math.max(rows.length, 1));
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + rows.length) % Math.max(rows.length, 1));
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const row = rows[activeIndex];
      if (row) {
        row.run();
        onClose();
      }
    }
  };

  if (typeof document === 'undefined') return null;

  let lastGroup = '';

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[150] flex items-start justify-center p-4 pt-[12vh]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="absolute inset-0 bg-ink-950/55 backdrop-blur-[3px]"
            aria-hidden="true"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Search and commands"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98, transition: { duration: 0.14 } }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            onKeyDown={onKeyDown}
            className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-surface shadow-pop ring-1 ring-hairline"
          >
            <div className="flex items-center gap-3 border-b border-hairline px-4 py-3.5">
              <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-faint" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search invoices, customers, products, or type a command"
                aria-label="Search invoices, customers, products and commands"
                className="w-full bg-transparent text-sm text-fg placeholder:text-faint focus:outline-none"
              />
              <kbd className="hidden shrink-0 rounded-md bg-sunken px-1.5 py-1 font-mono text-2xs text-faint ring-1 ring-inset ring-hairline sm:block">
                esc
              </kbd>
            </div>

            <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-2">
              {rows.length === 0 ? (
                <p className="px-3 py-10 text-center text-sm text-faint">
                  Nothing matches “{query}”. Try a customer, an invoice number, or an item you have
                  billed before.
                </p>
              ) : (
                rows.map((row, index) => {
                  const showGroup = row.group !== lastGroup;
                  lastGroup = row.group;
                  const Icon = row.icon;
                  return (
                    <div key={row.id}>
                      {showGroup && (
                        <p className="px-3 pb-1 pt-3 text-2xs font-bold uppercase tracking-wider text-faint">
                          {row.group}
                        </p>
                      )}
                      <button
                        type="button"
                        data-index={index}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => {
                          row.run();
                          onClose();
                        }}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                          index === activeIndex ? 'bg-sunken' : 'bg-transparent',
                        )}
                      >
                        <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-muted" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-fg">{row.title}</span>
                          {row.subtitle && (
                            <span className="block truncate text-xs text-faint">{row.subtitle}</span>
                          )}
                        </span>
                        {row.meta && (
                          <span className="shrink-0 font-mono text-2xs text-faint">{row.meta}</span>
                        )}
                        {index === activeIndex && (
                          <CornerDownLeft aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-faint" />
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center gap-3 border-t border-hairline bg-sunken/60 px-4 py-2 text-2xs text-faint">
              <Command aria-hidden="true" className="h-3 w-3" />
              <span>↑↓ to move</span>
              <span>↵ to select</span>
              <span className="ml-auto">{rows.length} results</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
