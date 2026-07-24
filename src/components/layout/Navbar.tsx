import {
  Archive,
  Check,
  CheckSquare,
  Cloud,
  Download,
  FilePlus2,
  ImageDown,
  MoreHorizontal,
  Printer,
  Save,
  Search,
  Square,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Menu } from '@/components/ui/Menu';
import { Tooltip } from '@/components/ui/Tooltip';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface NavbarProps {
  onNewInvoice: () => void;
  onSave: () => void;
  onPrint: () => void;
  onDownload: () => void;
  onDownloadImage: () => void;
  onOpenHistory: () => void;
  onOpenSearch: () => void;
  savedAt: number | null;
  saving: boolean;
  exporting: boolean;
  savedCount: number;
  /** False means PDF and print use white paper whatever the app theme is. */
  exportFollowsTheme: boolean;
  onToggleExportTheme: () => void;
}

/** The app's one persistent surface: identity, autosave state and every action. */
export function Navbar({
  onNewInvoice,
  onSave,
  onPrint,
  onDownload,
  onDownloadImage,
  onOpenHistory,
  onOpenSearch,
  savedAt,
  saving,
  exporting,
  exportFollowsTheme,
  onToggleExportTheme,
  savedCount,
}: NavbarProps) {
  return (
    <header className="no-print sticky top-0 z-40 border-b border-hairline glass">
      <div className="mx-auto flex h-[var(--nav-h)] max-w-[1800px] items-center gap-3 px-4 sm:px-6">
        {/* Wordmark */}
        <a
          href="#editor"
          className="flex shrink-0 items-center gap-2.5 rounded-lg focus-visible:outline-none"
          aria-label="Ledger — go to the invoice editor"
        >
          <span className="grad-brand grid h-8 w-8 place-items-center rounded-[10px] shadow-[0_2px_8px_-2px_rgb(14_124_102/0.6)]">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
              <path
                d="M5 4.5h11.5L19 7v12.5H5V4.5Z"
                stroke="white"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <path
                d="M8.5 10h7M8.5 13.5h7M8.5 17h4"
                stroke="white"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span className="hidden text-[0.9375rem] font-extrabold tracking-[-0.02em] text-fg sm:block">
            Ledger
          </span>
        </a>

        {/* Autosave state — quiet, but always answerable. */}
        <span
          className="hidden items-center gap-1.5 rounded-lg bg-sunken px-2.5 py-1 text-2xs font-medium text-muted ring-1 ring-inset ring-hairline md:inline-flex"
          aria-live="polite"
        >
          {saving ? (
            <>
              <Cloud aria-hidden="true" className="h-3 w-3 animate-pulse text-brand-500" />
              Saving…
            </>
          ) : savedAt ? (
            <>
              <Check aria-hidden="true" className="h-3 w-3 text-brand-500" />
              Saved {timeAgo(savedAt)}
            </>
          ) : (
            <>
              <Cloud aria-hidden="true" className="h-3 w-3" />
              Autosaves as you type
            </>
          )}
        </span>

        <div className="flex-1" />

        <button
          type="button"
          onClick={onOpenSearch}
          className={cn(
            'hidden h-9 items-center gap-2 rounded-xl bg-sunken pl-3 pr-2 text-sm text-faint',
            'ring-1 ring-inset ring-hairline transition-colors hover:text-muted hover:ring-faint/50 sm:flex',
          )}
          aria-label="Search invoices, customers and products"
        >
          <Search aria-hidden="true" className="h-3.5 w-3.5" />
          <span className="hidden lg:block">Search</span>
          <kbd className="rounded-md bg-surface px-1.5 py-0.5 font-mono text-2xs ring-1 ring-inset ring-hairline">
            ⌘K
          </kbd>
        </button>

        <Tooltip label={`Saved invoices${savedCount ? ` (${savedCount})` : ''}`} side="bottom">
          <button
            type="button"
            onClick={onOpenHistory}
            aria-label={`Open saved invoices, ${savedCount} stored`}
            className="relative grid h-9 w-9 place-items-center rounded-xl text-muted ring-1 ring-inset ring-hairline transition-colors hover:bg-sunken hover:text-fg"
          >
            <Archive aria-hidden="true" className="h-4 w-4" />
            {savedCount > 0 && (
              <span className="absolute -right-1 -top-1 grid h-4 min-w-[1rem] place-items-center rounded-full bg-brand-500 px-1 font-mono text-[0.5625rem] font-bold text-white">
                {savedCount > 99 ? '99+' : savedCount}
              </span>
            )}
          </button>
        </Tooltip>

        <ThemeToggle />

        <span className="mx-0.5 hidden h-6 w-px bg-hairline sm:block" aria-hidden="true" />

        <Button
          variant="secondary"
          size="sm"
          onClick={onSave}
          loading={saving}
          leftIcon={<Save className="h-3.5 w-3.5" />}
          className="hidden sm:inline-flex"
        >
          Save
        </Button>

        <Button
          variant="primary"
          size="sm"
          onClick={onDownload}
          loading={exporting}
          loadingText="Building PDF"
          leftIcon={<Download className="h-3.5 w-3.5" />}
        >
          <span className="hidden xs:inline">Download PDF</span>
          <span className="xs:hidden">PDF</span>
        </Button>

        <Menu
          label="More actions"
          items={[
            {
              id: 'new',
              label: 'New invoice',
              icon: <FilePlus2 />,
              onSelect: onNewInvoice,
              meta: '⌘⇧N',
            },
            { id: 'save', label: 'Save invoice', icon: <Save />, onSelect: onSave, meta: '⌘S' },
            { id: 'print', label: 'Print', icon: <Printer />, onSelect: onPrint, meta: '⌘P' },
            {
              id: 'png',
              label: 'Save as image',
              icon: <ImageDown />,
              onSelect: onDownloadImage,
            },
            { id: 'search', label: 'Search', icon: <Search />, onSelect: onOpenSearch, meta: '⌘K' },
            { id: 'history', label: 'Saved invoices', icon: <Archive />, onSelect: onOpenHistory },
            {
              id: 'export-theme',
              label: 'Export using current theme',
              icon: exportFollowsTheme ? <CheckSquare /> : <Square />,
              onSelect: onToggleExportTheme,
              meta: exportFollowsTheme ? 'On' : 'Off',
            },
          ]}
          trigger={({ open, toggle, ref }) => (
            <button
              ref={ref}
              type="button"
              onClick={toggle}
              aria-haspopup="menu"
              aria-expanded={open}
              aria-label="More actions"
              className={cn(
                'grid h-9 w-9 shrink-0 place-items-center rounded-xl text-muted ring-1 ring-inset ring-hairline transition-colors hover:bg-sunken hover:text-fg',
                open && 'bg-sunken text-fg',
              )}
            >
              <MoreHorizontal aria-hidden="true" className="h-4 w-4" />
            </button>
          )}
        />
      </div>
    </header>
  );
}
