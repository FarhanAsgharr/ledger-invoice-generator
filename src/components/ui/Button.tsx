import { forwardRef, useCallback, useRef, useState } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn, uid } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'subtle';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';

interface Ripple {
  id: string;
  x: number;
  y: number;
  size: number;
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** Replaces the label while `loading` is true. */
  loadingText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'grad-brand text-white shadow-[0_1px_2px_rgb(8_11_16/0.16),0_6px_16px_-6px_rgb(14_124_102/0.65)] hover:brightness-110 active:brightness-95',
  secondary:
    'bg-surface text-fg ring-1 ring-inset ring-hairline shadow-card hover:bg-sunken active:bg-sunken',
  outline: 'bg-transparent text-fg ring-1 ring-inset ring-hairline hover:bg-sunken active:bg-sunken',
  ghost: 'bg-transparent text-muted hover:bg-sunken hover:text-fg active:bg-sunken',
  subtle: 'bg-brand-500/10 text-brand-700 dark:text-brand-300 hover:bg-brand-500/16',
  danger:
    'bg-danger-400 text-white shadow-[0_1px_2px_rgb(8_11_16/0.16),0_6px_16px_-6px_rgb(206_47_53/0.6)] hover:bg-danger-500 active:bg-danger-600',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[0.8125rem] gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-[0.9375rem] gap-2.5 rounded-xl',
  icon: 'h-10 w-10 rounded-xl',
  'icon-sm': 'h-8 w-8 rounded-lg',
};

/**
 * The one button in the app. Every state the brief calls for — hover, active,
 * disabled, loading, and a pointer-anchored ripple — lives here so no screen
 * has to reinvent them.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    loading = false,
    loadingText,
    leftIcon,
    rightIcon,
    fullWidth,
    className,
    children,
    disabled,
    onPointerDown,
    type = 'button',
    ...rest
  },
  ref,
) {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const cleanup = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const isDisabled = disabled || loading;

  const spawnRipple = useCallback<NonNullable<ButtonProps['onPointerDown']>>(
    (event) => {
      onPointerDown?.(event);
      if (isDisabled) return;
      const target = event.currentTarget;
      const rect = target.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const ripple: Ripple = {
        id: uid('ripple'),
        x: event.clientX - rect.left - size / 2,
        y: event.clientY - rect.top - size / 2,
        size,
      };
      setRipples((current) => [...current, ripple]);
      cleanup.current.set(
        ripple.id,
        setTimeout(() => {
          setRipples((current) => current.filter((item) => item.id !== ripple.id));
          cleanup.current.delete(ripple.id);
        }, 620),
      );
    },
    [isDisabled, onPointerDown],
  );

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      onPointerDown={spawnRipple}
      className={cn(
        'relative isolate inline-flex select-none items-center justify-center overflow-hidden',
        'font-semibold tracking-[-0.01em] transition-[transform,background-color,box-shadow,filter,color]',
        'duration-200 ease-swift will-change-transform',
        'active:translate-y-px',
        'disabled:pointer-events-none disabled:opacity-45 disabled:shadow-none',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          aria-hidden="true"
          className="pointer-events-none absolute -z-10 animate-ripple rounded-full bg-current opacity-25"
          style={{ left: ripple.x, top: ripple.y, width: ripple.size, height: ripple.size }}
        />
      ))}

      {loading ? (
        <Loader2 aria-hidden="true" className="h-4 w-4 shrink-0 animate-spin" />
      ) : (
        leftIcon
      )}

      {children != null && (
        <span className="truncate">{loading && loadingText ? loadingText : children}</span>
      )}

      {!loading && rightIcon}
    </button>
  );
});
