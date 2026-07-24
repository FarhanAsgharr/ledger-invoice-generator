import { useEffect } from 'react';
import type { RefObject } from 'react';

/**
 * Call `handler` when a pointer goes down outside `ref`.
 * Uses `pointerdown` so the menu closes before the click lands elsewhere.
 */
export function useOnClickOutside(
  ref: RefObject<HTMLElement | null>,
  handler: () => void,
  enabled = true,
): void {
  useEffect(() => {
    if (!enabled) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      const node = ref.current;
      if (!node || node.contains(event.target as Node)) return;
      handler();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [ref, handler, enabled]);
}
