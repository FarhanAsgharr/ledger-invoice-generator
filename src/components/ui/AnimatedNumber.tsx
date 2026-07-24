import { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { formatMoney } from '@/lib/format';

interface AnimatedMoneyProps {
  value: number;
  currencyCode: string;
  className?: string;
  /** Milliseconds for the roll. Kept short so it never lags behind typing. */
  duration?: number;
}

const easeOut = (t: number) => 1 - (1 - t) ** 3;

/**
 * Money that rolls to its new value instead of snapping.
 *
 * Only the grand total uses this: animating every figure on the ladder would
 * turn a keystroke into a light show. Reduced-motion users get the plain value.
 */
export function AnimatedMoney({
  value,
  currencyCode,
  className,
  duration = 420,
}: AnimatedMoneyProps) {
  const reduceMotion = usePrefersReducedMotion();
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const frameRef = useRef<number>();

  useEffect(() => {
    if (reduceMotion) {
      fromRef.current = value;
      setDisplay(value);
      return undefined;
    }

    const from = fromRef.current;
    if (from === value) return undefined;

    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const next = from + (value - from) * easeOut(progress);
      setDisplay(next);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step);
      } else {
        fromRef.current = value;
      }
    };

    frameRef.current = requestAnimationFrame(step);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      fromRef.current = value;
    };
  }, [value, duration, reduceMotion]);

  return (
    <span className={className} aria-label={formatMoney(value, currencyCode)}>
      <span aria-hidden="true">{formatMoney(display, currencyCode)}</span>
    </span>
  );
}
