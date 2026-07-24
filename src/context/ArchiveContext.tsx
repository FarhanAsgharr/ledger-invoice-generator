import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useInvoiceHistory } from '@/hooks/useInvoiceHistory';
import type { InvoiceHistory } from '@/hooks/useInvoiceHistory';
import type { Customer, LineItem } from '@/types';

export interface ProductSuggestion {
  name: string;
  description: string;
  unitPrice: number;
  taxRate: number;
  /** How many past invoices used it — drives ordering. */
  uses: number;
}

export interface CustomerSuggestion extends Customer {
  uses: number;
  lastUsed: number;
}

interface ArchiveContextValue {
  history: InvoiceHistory;
  products: ProductSuggestion[];
  customers: CustomerSuggestion[];
}

const ArchiveContext = createContext<ArchiveContextValue | null>(null);

function productKey(item: LineItem): string {
  return item.name.trim().toLowerCase();
}

/**
 * Wraps the saved-invoice archive and the two indexes derived from it: the
 * products a user has billed before, and the customers they have billed.
 *
 * Both are recomputed from history rather than stored separately — one source
 * of truth means they can never drift out of date.
 */
export function ArchiveProvider({ children }: { children: ReactNode }) {
  const history = useInvoiceHistory();

  const products = useMemo(() => {
    const index = new Map<string, ProductSuggestion>();
    for (const entry of history.entries) {
      for (const item of entry.invoice.items) {
        const key = productKey(item);
        if (!key) continue;
        const existing = index.get(key);
        if (existing) {
          existing.uses += 1;
          // Keep the most recent price and description.
          if (entry.savedAt >= entry.invoice.updatedAt) {
            existing.unitPrice = item.unitPrice;
          }
        } else {
          index.set(key, {
            name: item.name.trim(),
            description: item.description,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
            uses: 1,
          });
        }
      }
    }
    return [...index.values()].sort((a, b) => b.uses - a.uses || a.name.localeCompare(b.name));
  }, [history.entries]);

  const customers = useMemo(() => {
    const index = new Map<string, CustomerSuggestion>();
    for (const entry of history.entries) {
      const customer = entry.invoice.customer;
      const key = `${customer.name.trim().toLowerCase()}|${customer.company.trim().toLowerCase()}`;
      if (key === '|') continue;
      const existing = index.get(key);
      if (existing) {
        existing.uses += 1;
        if (entry.savedAt > existing.lastUsed) existing.lastUsed = entry.savedAt;
      } else {
        index.set(key, { ...customer, uses: 1, lastUsed: entry.savedAt });
      }
    }
    return [...index.values()].sort((a, b) => b.lastUsed - a.lastUsed);
  }, [history.entries]);

  const value = useMemo<ArchiveContextValue>(
    () => ({ history, products, customers }),
    [history, products, customers],
  );

  return <ArchiveContext.Provider value={value}>{children}</ArchiveContext.Provider>;
}

export function useArchive(): ArchiveContextValue {
  const context = useContext(ArchiveContext);
  if (!context) throw new Error('useArchive must be used inside <ArchiveProvider>');
  return context;
}
