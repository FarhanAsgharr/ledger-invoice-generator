import { useId } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface Segment<T extends string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  segments: Segment<T>[];
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  className?: string;
  'aria-label': string;
}

/**
 * Radio group styled as a pill. The active indicator is a shared layout element,
 * so it slides between options rather than blinking.
 */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  segments,
  size = 'md',
  fullWidth,
  className,
  'aria-label': ariaLabel,
}: SegmentedControlProps<T>) {
  const layoutId = useId();

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-xl bg-sunken p-1 ring-1 ring-inset ring-hairline',
        fullWidth && 'w-full',
        className,
      )}
    >
      {segments.map((segment) => {
        const active = segment.value === value;
        return (
          <button
            key={segment.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(segment.value)}
            className={cn(
              'relative inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg',
              'font-semibold transition-colors duration-200',
              size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-[0.8125rem]',
              active ? 'text-fg' : 'text-muted hover:text-fg',
            )}
          >
            {active && (
              <motion.span
                layoutId={`segment-${layoutId}`}
                aria-hidden="true"
                className="absolute inset-0 rounded-lg bg-surface shadow-card ring-1 ring-inset ring-hairline"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative z-10 inline-flex items-center gap-1.5">
              {segment.icon}
              {segment.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
