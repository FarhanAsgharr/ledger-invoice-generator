import { normalizeInvoice } from '@/lib/invoice-factory';
import { toNumber } from '@/lib/utils';
import type { Invoice, StoredInvoice, ThemeMode } from '@/types';

/**
 * Everything Ledger persists lives in localStorage under the `ledger.` prefix.
 * There is no server; this module is the whole persistence layer.
 *
 * Every read is defensive — storage can be disabled (Safari private mode),
 * full, or hold data written by an older version of the app.
 */

export const STORAGE_KEYS = {
  theme: 'ledger.theme',
  draft: 'ledger.draft',
  history: 'ledger.history',
  lastNumber: 'ledger.lastNumber',
  version: 'ledger.version',
} as const;

export const SCHEMA_VERSION = 1;

/** Keeping history bounded is what stops autosave from ever hitting the quota. */
export const HISTORY_LIMIT = 100;

let available: boolean | null = null;

/** Probe once. Private-mode Safari throws on `setItem`, not on access. */
export function storageAvailable(): boolean {
  if (available !== null) return available;
  try {
    const probe = '__ledger_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    available = true;
  } catch {
    available = false;
  }
  return available;
}

function readRaw(key: string): string | null {
  if (!storageAvailable()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeRaw(key: string, value: string): boolean {
  if (!storageAvailable()) return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function removeRaw(key: string): void {
  if (!storageAvailable()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* nothing useful to do */
  }
}

function parseJSON<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/* ── Theme ───────────────────────────────────────────────────────────────── */

export function loadTheme(): ThemeMode | null {
  const value = readRaw(STORAGE_KEYS.theme);
  return value === 'light' || value === 'dark' ? value : null;
}

export function saveTheme(mode: ThemeMode): void {
  writeRaw(STORAGE_KEYS.theme, mode);
}

/* ── Draft (autosave) ────────────────────────────────────────────────────── */

export function loadDraft(): Invoice | null {
  const parsed = parseJSON<unknown>(readRaw(STORAGE_KEYS.draft));
  if (!parsed) return null;
  return normalizeInvoice(parsed);
}

export function saveDraft(invoice: Invoice): boolean {
  return writeRaw(STORAGE_KEYS.draft, JSON.stringify(invoice));
}

export function clearDraft(): void {
  removeRaw(STORAGE_KEYS.draft);
}

/* ── Invoice number series ───────────────────────────────────────────────── */

export function loadLastNumber(): string | null {
  return readRaw(STORAGE_KEYS.lastNumber);
}

export function saveLastNumber(value: string): void {
  writeRaw(STORAGE_KEYS.lastNumber, value);
}

/* ── History ─────────────────────────────────────────────────────────────── */

function normalizeStored(value: unknown): StoredInvoice | null {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  if (!record.invoice) return null;
  const invoice = normalizeInvoice(record.invoice);
  return {
    invoice,
    grandTotal: toNumber(record.grandTotal),
    savedAt: toNumber(record.savedAt, invoice.updatedAt),
  };
}

export function loadHistory(): StoredInvoice[] {
  const parsed = parseJSON<unknown>(readRaw(STORAGE_KEYS.history));
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map(normalizeStored)
    .filter((entry): entry is StoredInvoice => entry !== null)
    .sort((a, b) => b.savedAt - a.savedAt)
    .slice(0, HISTORY_LIMIT);
}

/**
 * Persist history, trimming oldest-first if the browser refuses the write.
 * A logo-heavy history is the only realistic way to hit the 5 MB quota.
 */
export function saveHistory(entries: StoredInvoice[]): boolean {
  let working = entries.slice(0, HISTORY_LIMIT);
  while (working.length > 0) {
    if (writeRaw(STORAGE_KEYS.history, JSON.stringify(working))) return true;
    working = working.slice(0, working.length - 1);
  }
  return writeRaw(STORAGE_KEYS.history, '[]');
}

export function clearHistory(): void {
  removeRaw(STORAGE_KEYS.history);
}

/* ── Housekeeping ────────────────────────────────────────────────────────── */

/** Keys written by earlier versions that nothing reads any more. */
const RETIRED_KEYS = [
  // Export used to be able to force white paper; it now always matches the
  // screen, so a leftover preference would only be confusing.
  'ledger.exportTheme',
];

/** Runs once on boot: stamps the schema version and clears retired keys. */
export function runMigrations(): void {
  RETIRED_KEYS.forEach(removeRaw);
  const stored = toNumber(readRaw(STORAGE_KEYS.version), 0);
  if (stored === SCHEMA_VERSION) return;
  writeRaw(STORAGE_KEYS.version, String(SCHEMA_VERSION));
}

/** Approximate footprint in bytes, shown in the history drawer. */
export function storageFootprint(): number {
  if (!storageAvailable()) return 0;
  let total = 0;
  for (const key of Object.values(STORAGE_KEYS)) {
    total += (readRaw(key)?.length ?? 0) * 2; // UTF-16 code units
  }
  return total;
}

export function wipeAll(): void {
  Object.values(STORAGE_KEYS).forEach(removeRaw);
}
