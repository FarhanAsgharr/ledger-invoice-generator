import { cloneElement, useId, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface TooltipProps {
  label: ReactNode;
  /** Also read by screen readers via `aria-describedby`. */
  children: ReactElement<Record<string, unknown>>;
  side?: 'top' | 'bottom';
  className?: string;
}

const SIDES = {
  top: 'bottom-full left-1/2 mb-2 -translate-x-1/2',
  bottom: 'top-full left-1/2 mt-2 -translate-x-1/2',
};

/**
 * Hover and focus tooltip. Deliberately CSS-positioned rather than floating-ui:
 * every tooltip in this app hangs off a small toolbar control near the viewport
 * centre, so collision handling would be weight without benefit.
 */
export function Tooltip({ label, children, side = 'top', className }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span
      className="relative inline-flex"
      onPointerEnter={() => setOpen(true)}
      onPointerLeave={() => setOpen(false)}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={() => setOpen(false)}
    >
      {cloneElement(children, { 'aria-describedby': id })}
      <AnimatePresence>
        {open && (
          <motion.span
            key="tip"
            role="tooltip"
            id={id}
            initial={{ opacity: 0, y: side === 'top' ? 4 : -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.12 } }}
            transition={{ duration: 0.16, ease: [0.32, 0.72, 0, 1] }}
            className={cn(
              'pointer-events-none absolute z-50 whitespace-nowrap rounded-lg px-2.5 py-1.5',
              'bg-ink-900 text-2xs font-semibold text-white shadow-lift dark:bg-ink-100 dark:text-ink-900',
              SIDES[side],
              className,
            )}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
