import { useId } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
  /** Accessible name when no visible label is rendered. */
  'aria-label'?: string;
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
  className,
  'aria-label': ariaLabel,
}: SwitchProps) {
  const id = useId();

  const control = (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={label ? undefined : ariaLabel}
      aria-describedby={description ? `${id}-desc` : undefined}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full p-0.5',
        'transition-colors duration-250 ease-swift',
        'ring-1 ring-inset',
        checked ? 'bg-brand-500 ring-brand-600/40' : 'bg-hairline ring-transparent',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none block h-5 w-5 rounded-full bg-white shadow-sm',
          'transition-transform duration-250 ease-swift',
          checked ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
  );

  if (!label && !description) return <div className={className}>{control}</div>;

  return (
    <div className={cn('flex items-start gap-3', className)}>
      {control}
      <div className="min-w-0">
        {label && (
          <label htmlFor={id} className="block cursor-pointer text-sm font-medium leading-6 text-fg">
            {label}
          </label>
        )}
        {description && (
          <p id={`${id}-desc`} className="text-xs leading-relaxed text-faint">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
