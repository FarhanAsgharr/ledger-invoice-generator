import { forwardRef, useId } from 'react';
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ── Shared shell ────────────────────────────────────────────────────────── */

interface FieldShellProps {
  id: string;
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
  /** Rendered right of the label — unit toggles, "same as billing", etc. */
  action?: ReactNode;
}

export function FieldShell({
  id,
  label,
  hint,
  error,
  required,
  className,
  children,
  action,
}: FieldShellProps) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      {(label || action) && (
        <div className="flex items-baseline justify-between gap-3">
          {label && (
            <label
              htmlFor={id}
              className="text-[0.8125rem] font-semibold leading-none text-muted"
            >
              {label}
              {required && (
                <span className="ml-1 text-danger-400" aria-hidden="true">
                  *
                </span>
              )}
            </label>
          )}
          {action}
        </div>
      )}

      {children}

      {/* Reserve nothing: the message region only exists when it has something
          to say, so fields do not jitter as you type. */}
      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="flex items-start gap-1.5 text-xs font-medium text-danger-400 animate-fade-up"
        >
          <AlertCircle aria-hidden="true" className="mt-px h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-faint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const CONTROL_BASE =
  'w-full rounded-xl bg-sunken px-3.5 text-sm text-fg placeholder:text-faint/80 ' +
  'ring-1 ring-inset ring-hairline transition-[box-shadow,background-color,border-color] duration-200 ' +
  'hover:ring-faint/45 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand-500 ' +
  'disabled:cursor-not-allowed disabled:opacity-55';

const CONTROL_ERROR = 'ring-danger-400 hover:ring-danger-400 focus:ring-danger-400';

/* ── Input ───────────────────────────────────────────────────────────────── */

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  action?: ReactNode;
  containerClassName?: string;
  /** Static text inside the field, e.g. a currency symbol. */
  prefix?: ReactNode;
  suffix?: ReactNode;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, action, containerClassName, prefix, suffix, icon, className, id, ...rest },
  ref,
) {
  const generated = useId();
  const fieldId = id ?? generated;
  const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined;

  return (
    <FieldShell
      id={fieldId}
      label={label}
      hint={hint}
      error={error}
      required={rest.required}
      action={action}
      className={containerClassName}
    >
      <div className="relative flex items-center">
        {icon && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-3 flex text-faint [&>svg]:h-4 [&>svg]:w-4"
          >
            {icon}
          </span>
        )}
        {prefix && (
          <span className="pointer-events-none absolute left-3.5 font-mono text-sm text-faint">
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            CONTROL_BASE,
            'h-10',
            Boolean(icon) && 'pl-9',
            Boolean(prefix) && 'pl-9',
            Boolean(suffix) && 'pr-10',
            error && CONTROL_ERROR,
            className,
          )}
          {...rest}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3.5 font-mono text-sm text-faint">
            {suffix}
          </span>
        )}
      </div>
    </FieldShell>
  );
});

/* ── Textarea ────────────────────────────────────────────────────────────── */

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  action?: ReactNode;
  containerClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, action, containerClassName, className, id, rows = 3, ...rest },
  ref,
) {
  const generated = useId();
  const fieldId = id ?? generated;
  const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined;

  return (
    <FieldShell
      id={fieldId}
      label={label}
      hint={hint}
      error={error}
      required={rest.required}
      action={action}
      className={containerClassName}
    >
      <textarea
        ref={ref}
        id={fieldId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(CONTROL_BASE, 'resize-y py-2.5 leading-relaxed', error && CONTROL_ERROR, className)}
        {...rest}
      />
    </FieldShell>
  );
});

/* ── Select ──────────────────────────────────────────────────────────────── */

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  action?: ReactNode;
  containerClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, action, containerClassName, className, id, children, ...rest },
  ref,
) {
  const generated = useId();
  const fieldId = id ?? generated;
  const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined;

  return (
    <FieldShell
      id={fieldId}
      label={label}
      hint={hint}
      error={error}
      required={rest.required}
      action={action}
      className={containerClassName}
    >
      <div className="relative">
        <select
          ref={ref}
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            CONTROL_BASE,
            'h-10 cursor-pointer appearance-none pr-9',
            error && CONTROL_ERROR,
            className,
          )}
          {...rest}
        >
          {children}
        </select>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 8 4 4 4-4" />
        </svg>
      </div>
    </FieldShell>
  );
});
