import { useCallback, useEffect, useMemo, useState } from 'react';
import { calculateTotals } from '@/lib/calc';
import { duplicateInvoice } from '@/lib/invoice-factory';
import { loadHistory, saveHistory } from '@/lib/storage';
import type { Invoice, StoredInvoice } from '@/types';

/**
 * The local invoice archive.
 *
 * Saving an invoice whose id already exists updates that entry in place, so
 * "Save" is idempotent and a user cannot accidentally fill the archive with
 * near-identical copies of the invoice they are editing.
 */
export function useInvoiceHistory() {
  const [entries, setEntries] = useState<StoredInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Deferred one frame so the first paint is never blocked by a JSON parse.
    const frame = requestAnimationFrame(() => {
      setEntries(loadHistory());
      setLoading(false);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  // Keep multiple tabs in sync.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'ledger.history') setEntries(loadHistory());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const persist = useCallback((next: StoredInvoice[]) => {
    setEntries(next);
    saveHistory(next);
  }, []);

  const save = useCallback(
    (invoice: Invoice): StoredInvoice => {
      const entry: StoredInvoice = {
        invoice: { ...invoice, updatedAt: Date.now() },
        grandTotal: calculateTotals(invoice).grandTotal,
        savedAt: Date.now(),
      };
      persist([entry, ...entries.filter((item) => item.invoice.id !== invoice.id)]);
      return entry;
    },
    [entries, persist],
  );

  const remove = useCallback(
    (id: string) => {
      persist(entries.filter((entry) => entry.invoice.id !== id));
    },
    [entries, persist],
  );

  const duplicate = useCallback(
    (id: string): Invoice | null => {
      const source = entries.find((entry) => entry.invoice.id === id);
      if (!source) return null;
      const copy = duplicateInvoice(source.invoice);
      persist([
        { invoice: copy, grandTotal: calculateTotals(copy).grandTotal, savedAt: Date.now() },
        ...entries,
      ]);
      return copy;
    },
    [entries, persist],
  );

  const clear = useCallback(() => persist([]), [persist]);

  const get = useCallback(
    (id: string) => entries.find((entry) => entry.invoice.id === id)?.invoice ?? null,
    [entries],
  );

  const stats = useMemo(() => {
    const total = entries.length;
    const paid = entries.filter((entry) => entry.invoice.status === 'paid').length;
    const outstanding = entries
      .filter((entry) => entry.invoice.status !== 'paid' && entry.invoice.status !== 'cancelled')
      .reduce((sum, entry) => sum + entry.grandTotal, 0);
    return { total, paid, outstanding };
  }, [entries]);

  return { entries, loading, save, remove, duplicate, clear, get, stats };
}

export type InvoiceHistory = ReturnType<typeof useInvoiceHistory>;
