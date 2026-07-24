import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PanelProps {
  /** Position in the sequence. Filling an invoice genuinely is one. */
  step: number;
  title: string;
  summary?: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  /** Rendered in the header, right of the title. Clicks do not toggle. */
  action?: ReactNode;
  id?: string;
  className?: string;
}

/**
 * A collapsible section of the editor. The step number is the structural device
 * — it encodes the order an invoice is actually filled in, and doubles as the
 * anchor for the section jump list.
 */
export function Panel({
  step,
  title,
  summary,
  icon,
  children,
  defaultOpen = true,
  action,
  id,
  className,
}: PanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const generated = useId();
  const contentId = `${id ?? generated}-content`;

  return (
    <section
      id={id}
      className={cn(
        'scroll-mt-24 overflow-hidden rounded-2xl bg-surface shadow-card ring-1 ring-hairline',
        'transition-shadow duration-300 hover:shadow-lift',
        className,
      )}
    >
      <div className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={contentId}
          className="group -m-1 flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1 text-left"
        >
          <span className="step-marker" aria-hidden="true">
            {String(step).padStart(2, '0')}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              {icon && (
                <span aria-hidden="true" className="text-muted [&>svg]:h-4 [&>svg]:w-4">
                  {icon}
                </span>
              )}
              <span className="truncate text-[0.9375rem] font-bold tracking-[-0.015em] text-fg">
                {title}
              </span>
            </span>
            {summary && !open && (
              <span className="mt-0.5 block truncate text-xs text-faint">{summary}</span>
            )}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'h-4 w-4 shrink-0 text-faint transition-transform duration-300 ease-swift',
              'group-hover:text-fg',
              open && 'rotate-180',
            )}
          />
        </button>
        {action && <div className="shrink-0">{action}</div>}
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={contentId}
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-hairline px-4 py-5 sm:px-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
