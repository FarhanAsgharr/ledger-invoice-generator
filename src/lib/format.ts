import { getCurrency } from '@/constants/currencies';
import type { Currency } from '@/types';

const moneyCache = new Map<string, Intl.NumberFormat>();

function moneyFormatter(currency: Currency): Intl.NumberFormat {
  const key = `${currency.code}:${currency.locale}:${currency.decimals}`;
  let fmt = moneyCache.get(key);
  if (!fmt) {
    try {
      fmt = new Intl.NumberFormat(currency.locale, {
        style: 'currency',
        currency: currency.code,
        minimumFractionDigits: currency.decimals,
        maximumFractionDigits: currency.decimals,
      });
    } catch {
      // Unknown locale/code on an older engine — fall back to plain grouping.
      fmt = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: currency.decimals,
        maximumFractionDigits: currency.decimals,
      });
    }
    moneyCache.set(key, fmt);
  }
  return fmt;
}

/** Format an amount in the invoice's currency, e.g. `$1,240.00`. */
export function formatMoney(amount: number, currencyCode: string): string {
  const currency = getCurrency(currencyCode);
  const value = Number.isFinite(amount) ? amount : 0;
  return moneyFormatter(currency).format(value);
}

/** Digits only — for right-aligned table columns that already show a symbol. */
export function formatAmount(amount: number, currencyCode: string): string {
  const currency = getCurrency(currencyCode);
  return new Intl.NumberFormat(currency.locale, {
    minimumFractionDigits: currency.decimals,
    maximumFractionDigits: currency.decimals,
  }).format(Number.isFinite(amount) ? amount : 0);
}

/** Trim trailing zeros on rates: 18 → "18", 8.25 → "8.25". */
export function formatRate(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return String(Math.round(value * 1000) / 1000);
}

/* ── Dates ───────────────────────────────────────────────────────────────── */

/** `yyyy-mm-dd` for today in the user's local timezone (not UTC). */
export function todayISO(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

/** Add days to a `yyyy-mm-dd` string and return the same format. */
export function addDays(iso: string, days: number): string {
  const date = parseISO(iso) ?? new Date();
  date.setDate(date.getDate() + days);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

/** Parse `yyyy-mm-dd` as a *local* date. `new Date(iso)` would parse it as UTC. */
export function parseISO(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "12 Mar 2025" — unambiguous across regions, unlike 03/12/2025. */
export function formatDate(iso: string, locale = 'en-GB'): string {
  const date = parseISO(iso);
  if (!date) return '—';
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/** "in 12 days" / "6 days ago" / "today" for due-date hints. */
export function relativeDays(iso: string): string {
  const date = parseISO(iso);
  if (!date) return '';
  const today = parseISO(todayISO());
  if (!today) return '';
  const diff = Math.round((date.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return 'due today';
  if (diff === 1) return 'due tomorrow';
  if (diff === -1) return '1 day overdue';
  return diff > 0 ? `due in ${diff} days` : `${Math.abs(diff)} days overdue`;
}

/** "2 minutes ago" for history cards and the autosave indicator. */
export function timeAgo(timestamp: number): string {
  const seconds = Math.round((Date.now() - timestamp) / 1000);
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(
    new Date(timestamp),
  );
}

/* ── Amount in words ─────────────────────────────────────────────────────── */

const ONES = [
  '',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const SCALES = ['', ' thousand', ' million', ' billion', ' trillion'];

function chunkToWords(chunk: number): string {
  const parts: string[] = [];
  const hundreds = Math.floor(chunk / 100);
  const rest = chunk % 100;
  if (hundreds) parts.push(`${ONES[hundreds]} hundred`);
  if (rest) {
    if (rest < 20) parts.push(ONES[rest]);
    else {
      const tens = TENS[Math.floor(rest / 10)];
      const ones = ONES[rest % 10];
      parts.push(ones ? `${tens}-${ones}` : tens);
    }
  }
  return parts.join(' ');
}

/** Whole number to English words. Used for the "amount in words" line. */
export function numberToWords(value: number): string {
  const n = Math.floor(Math.abs(value));
  if (n === 0) return 'zero';
  const chunks: number[] = [];
  let remaining = n;
  while (remaining > 0) {
    chunks.push(remaining % 1000);
    remaining = Math.floor(remaining / 1000);
  }
  if (chunks.length > SCALES.length) return String(n);
  return chunks
    .map((chunk, index) => (chunk ? `${chunkToWords(chunk)}${SCALES[index]}` : ''))
    .filter(Boolean)
    .reverse()
    .join(' ');
}

/** "One thousand two hundred and forty US Dollars and 50 cents only". */
export function amountInWords(amount: number, currencyCode: string): string {
  const currency = getCurrency(currencyCode);
  const safe = Number.isFinite(amount) ? Math.abs(amount) : 0;
  const whole = Math.floor(safe);
  const fraction = Math.round((safe - whole) * 10 ** currency.decimals);
  const head = `${numberToWords(whole)} ${currency.name}${whole === 1 ? '' : 's'}`;
  const sentence = fraction > 0 ? `${head} and ${fraction}/${10 ** currency.decimals}` : head;
  const capitalised = sentence.charAt(0).toUpperCase() + sentence.slice(1);
  return `${capitalised} only`;
}
