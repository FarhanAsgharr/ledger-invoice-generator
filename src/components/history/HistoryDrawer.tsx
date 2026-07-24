import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Archive, Copy, FileDown, Search, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { HistorySkeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { Tooltip } from '@/components/ui/Tooltip';
import { STATUSES, getStatus } from '@/constants/invoice';
import { useArchive } from '@/context/ArchiveContext';
import { useToast } from '@/context/ToastContext';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { formatDate, formatMoney, timeAgo } from '@/lib/format';
import { storageFootprint } from '@/lib/storage';
import { cn } from '@/lib/utils';
import type { Invoice, InvoiceStatus } from '@/types';

interface HistoryDrawerProps {
  open: boolean;
  onClose: () => void;
  onOpenInvoice: (invoice: Invoice) => void;
  currentId: string;
}

type StatusFilter = InvoiceStatus | 'all';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Slide-over listing every invoice saved on this device. */
export function HistoryDrawer({ open, onClose, onOpenInvoice, currentId }: HistoryDrawerProps) {
  const { history } = useArchive();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [confirmClear, setConfirmClear] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 180);

  const results = useMemo(() => {
    const needle = debouncedQuery.trim().toLowerCase();
    return history.entries.filter((entry) => {
      if (status !== 'all' && entry.invoice.status !== status) return false;
      if (!needle) return true;
      const { invoice } = entry;
      const haystack = [
        invoice.number,
        invoice.poNumber,
        invoice.customer.name,
        invoice.customer.company,
        invoice.customer.email,
        invoice.business.name,
        ...invoice.items.map((item) => item.name),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [history.entries, debouncedQuery, status]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[90]">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
              className="absolute inset-0 bg-ink-950/50 backdrop-blur-[2px]"
              aria-hidden="true"
            />

            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label="Saved invoices"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
              className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-canvas shadow-pop ring-1 ring-hairline"
            >
              <header className="flex items-start justify-between gap-4 border-b border-hairline bg-surface px-5 py-4">
                <div>
                  <h2 className="flex items-center gap-2 text-base font-bold tracking-[-0.015em] text-fg">
                    <Archive aria-hidden="true" className="h-4 w-4 text-brand-500" />
                    Saved invoices
                  </h2>
                  <p className="mt-0.5 text-xs text-muted">
                    {history.stats.total} saved · {history.stats.paid} paid ·{' '}
                    {formatBytes(storageFootprint())} on this device
                  </p>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close saved invoices">
                  <X aria-hidden="true" className="h-4 w-4" />
                </Button>
              </header>

              <div className="space-y-3 border-b border-hairline bg-surface px-5 pb-4">
                <div className="relative">
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint"
                  />
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search by number, customer or item"
                    aria-label="Search saved invoices"
                    className="h-10 w-full rounded-xl bg-sunken pl-9 pr-3 text-sm text-fg ring-1 ring-inset ring-hairline placeholder:text-faint focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
                  {(['all', ...STATUSES.map((s) => s.id)] as StatusFilter[]).map((id) => {
                    const label = id === 'all' ? 'All' : getStatus(id as InvoiceStatus).label;
                    const active = status === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setStatus(id)}
                        aria-pressed={active}
                        className={cn(
                          'shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold ring-1 ring-inset transition-colors',
                          active
                            ? 'bg-brand-500/12 text-brand-700 ring-brand-500/40 dark:text-brand-300'
                            : 'bg-sunken text-muted ring-hairline hover:text-fg',
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                {history.loading ? (
                  <HistorySkeleton />
                ) : results.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-surface px-6 py-14 text-center ring-1 ring-inset ring-hairline">
                    <Archive aria-hidden="true" className="h-6 w-6 text-faint" />
                    <p className="text-sm font-semibold text-fg">
                      {history.entries.length === 0 ? 'No saved invoices yet' : 'Nothing matches that search'}
                    </p>
                    <p className="max-w-[24ch] text-xs text-muted">
                      {history.entries.length === 0
                        ? 'Save an invoice and it will appear here, ready to reopen or duplicate.'
                        : 'Try a different number, customer or item name.'}
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-2.5">
                    {results.map((entry) => {
                      const meta = getStatus(entry.invoice.status);
                      const isCurrent = entry.invoice.id === currentId;
                      return (
                        <li key={entry.invoice.id}>
                          <div
                            className={cn(
                              'group rounded-2xl bg-surface p-4 ring-1 ring-inset transition-all duration-200',
                              isCurrent ? 'ring-brand-500' : 'ring-hairline hover:shadow-card',
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <button
                                type="button"
                                onClick={() => {
                                  onOpenInvoice(entry.invoice);
                                  onClose();
                                }}
                                className="min-w-0 flex-1 text-left"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="truncate font-mono text-sm font-semibold text-fg">
                                    {entry.invoice.number}
                                  </span>
                                  <span
                                    className={cn(
                                      'shrink-0 rounded-md px-1.5 py-0.5 text-2xs font-bold uppercase tracking-wide',
                                      meta.chip,
                                    )}
                                  >
                                    {meta.label}
                                  </span>
                                </div>
                                <p className="mt-1 truncate text-[0.8125rem] text-muted">
                                  {entry.invoice.customer.company ||
                                    entry.invoice.customer.name ||
                                    'No customer'}
                                </p>
                                <p className="mt-0.5 text-2xs text-faint">
                                  Issued {formatDate(entry.invoice.issueDate)} · saved{' '}
                                  {timeAgo(entry.savedAt)}
                                </p>
                              </button>

                              <div className="shrink-0 text-right">
                                <p className="font-mono text-sm font-semibold tabular text-fg">
                                  {formatMoney(entry.grandTotal, entry.invoice.currencyCode)}
                                </p>
                                <div className="mt-1.5 flex justify-end gap-0.5">
                                  <Tooltip label="Duplicate">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const copy = history.duplicate(entry.invoice.id);
                                        if (copy) {
                                          toast.success('Invoice duplicated', copy.number);
                                        }
                                      }}
                                      aria-label={`Duplicate invoice ${entry.invoice.number}`}
                                      className="rounded-lg p-1.5 text-faint transition-colors hover:bg-sunken hover:text-fg"
                                    >
                                      <Copy aria-hidden="true" className="h-3.5 w-3.5" />
                                    </button>
                                  </Tooltip>
                                  <Tooltip label="Open">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onOpenInvoice(entry.invoice);
                                        onClose();
                                      }}
                                      aria-label={`Open invoice ${entry.invoice.number}`}
                                      className="rounded-lg p-1.5 text-faint transition-colors hover:bg-sunken hover:text-fg"
                                    >
                                      <FileDown aria-hidden="true" className="h-3.5 w-3.5" />
                                    </button>
                                  </Tooltip>
                                  <Tooltip label="Delete">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        history.remove(entry.invoice.id);
                                        toast.info('Invoice deleted', entry.invoice.number);
                                      }}
                                      aria-label={`Delete invoice ${entry.invoice.number}`}
                                      className="rounded-lg p-1.5 text-faint transition-colors hover:bg-danger-400/10 hover:text-danger-400"
                                    >
                                      <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                                    </button>
                                  </Tooltip>
                                </div>
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {history.entries.length > 0 && (
                <footer className="border-t border-hairline bg-surface px-5 py-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    fullWidth
                    onClick={() => setConfirmClear(true)}
                    className="text-danger-400 hover:bg-danger-400/10 hover:text-danger-400"
                    leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                  >
                    Delete all saved invoices
                  </Button>
                </footer>
              )}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <Modal
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Delete all saved invoices?"
        description="This removes every invoice stored in this browser. It cannot be undone, and the invoice you are editing stays open."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmClear(false)}>
              Keep them
            </Button>
            <Button
              variant="danger"
              data-autofocus
              onClick={() => {
                history.clear();
                setConfirmClear(false);
                toast.success('Saved invoices deleted');
              }}
            >
              Delete everything
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          {history.entries.length} {history.entries.length === 1 ? 'invoice' : 'invoices'} will be
          removed from this device.
        </p>
      </Modal>
    </>,
    document.body,
  );
}
