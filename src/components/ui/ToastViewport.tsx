import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Toast, ToastVariant } from '@/types';

const ICONS: Record<ToastVariant, LucideIcon> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const ACCENTS: Record<ToastVariant, string> = {
  success: 'text-brand-500',
  error: 'text-danger-400',
  warning: 'text-amber-500',
  info: 'text-blue-500',
};

const RAILS: Record<ToastVariant, string> = {
  success: 'bg-brand-500',
  error: 'bg-danger-400',
  warning: 'bg-amber-500',
  info: 'bg-blue-500',
};

interface ToastViewportProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

/**
 * Toasts live in a portal so no ancestor's `overflow` or stacking context can
 * clip them. The region is polite-live: it announces without stealing focus.
 */
export function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="region"
      aria-label="Notifications"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[200] flex flex-col items-center gap-2.5 p-4 sm:inset-x-auto sm:right-0 sm:top-0 sm:items-end sm:p-5"
    >
      <div aria-live="polite" aria-atomic="false" className="contents">
        <AnimatePresence initial={false}>
          {toasts.map((toast) => {
            const Icon = ICONS[toast.variant];
            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 24, scale: 0.96, transition: { duration: 0.18 } }}
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                className="pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-2xl bg-surface shadow-pop ring-1 ring-hairline"
              >
                <span aria-hidden="true" className={cn('absolute inset-y-0 left-0 w-1', RAILS[toast.variant])} />
                <div className="flex items-start gap-3 py-3.5 pl-5 pr-3">
                  <Icon
                    aria-hidden="true"
                    className={cn('mt-0.5 h-[1.125rem] w-[1.125rem] shrink-0', ACCENTS[toast.variant])}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-snug text-fg">{toast.title}</p>
                    {toast.description && (
                      <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-muted">
                        {toast.description}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onDismiss(toast.id)}
                    aria-label={`Dismiss: ${toast.title}`}
                    className="-mr-0.5 -mt-0.5 rounded-lg p-1.5 text-faint transition-colors hover:bg-sunken hover:text-fg"
                  >
                    <X aria-hidden="true" className="h-3.5 w-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>,
    document.body,
  );
}
