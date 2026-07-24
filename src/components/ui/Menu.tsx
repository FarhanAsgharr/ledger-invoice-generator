import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useOnClickOutside } from '@/hooks/useOnClickOutside';

export interface MenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
  /** Right-aligned hint, e.g. a keyboard shortcut. */
  meta?: string;
}

interface MenuProps {
  /** Render prop for the button that opens the menu. */
  trigger: (props: {
    open: boolean;
    toggle: () => void;
    ref: (node: HTMLButtonElement | null) => void;
  }) => ReactNode;
  items: MenuItem[];
  align?: 'left' | 'right';
  label: string;
}

/** Keyboard-navigable dropdown: arrows move, Enter selects, Escape closes. */
export function Menu({ trigger, items, align = 'right', label }: MenuProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const close = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
  }, []);

  useOnClickOutside(containerRef, close, open);

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    itemRefs.current[activeIndex]?.focus();
  }, [open, activeIndex]);

  const enabled = items.filter((item) => !item.disabled);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!open) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      triggerRef.current?.focus();
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((current) => {
        const next = current + direction;
        if (next < 0) return items.length - 1;
        if (next >= items.length) return 0;
        return next;
      });
    }
    if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(0);
    }
    if (event.key === 'End') {
      event.preventDefault();
      setActiveIndex(items.length - 1);
    }
  };

  return (
    <div ref={containerRef} className="relative" onKeyDown={onKeyDown}>
      {trigger({
        open,
        toggle: () => {
          setOpen((value) => !value);
          setActiveIndex(-1);
        },
        ref: (node) => {
          triggerRef.current = node;
        },
      })}

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            aria-label={label}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.12 } }}
            transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
            className={cn(
              'absolute top-full z-50 mt-2 min-w-[13rem] origin-top overflow-hidden rounded-2xl p-1.5',
              'bg-surface shadow-pop ring-1 ring-hairline',
              align === 'right' ? 'right-0' : 'left-0',
            )}
          >
            {items.map((item, index) => (
              <button
                key={item.id}
                ref={(node) => {
                  itemRefs.current[index] = node;
                }}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                tabIndex={activeIndex === index ? 0 : -1}
                onClick={() => {
                  item.onSelect();
                  close();
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium',
                  'transition-colors duration-150',
                  'disabled:pointer-events-none disabled:opacity-40',
                  item.destructive
                    ? 'text-danger-400 hover:bg-danger-400/10'
                    : 'text-fg hover:bg-sunken',
                )}
              >
                {item.icon && (
                  <span aria-hidden="true" className="shrink-0 text-muted [&>svg]:h-4 [&>svg]:w-4">
                    {item.icon}
                  </span>
                )}
                <span className="flex-1 truncate">{item.label}</span>
                {item.meta && <span className="font-mono text-2xs text-faint">{item.meta}</span>}
              </button>
            ))}
            {enabled.length === 0 && (
              <p className="px-3 py-2 text-sm text-faint">Nothing available yet</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
