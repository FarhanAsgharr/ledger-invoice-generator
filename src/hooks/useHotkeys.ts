import { useEffect, useRef } from 'react';

type Handler = (event: KeyboardEvent) => void;

/** True when focus is in a field where a bare letter should type, not trigger. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable ||
    target.getAttribute('role') === 'textbox'
  );
}

/**
 * Register global shortcuts.
 *
 * Keys are written as `mod+s`, `mod+shift+p`, `escape`. `mod` is ⌘ on macOS and
 * Ctrl elsewhere. Combos with a modifier fire even while typing; bare keys do
 * not, so shortcuts never eat a character mid-sentence.
 */
export function useHotkeys(bindings: Record<string, Handler>, enabled = true): void {
  const ref = useRef(bindings);
  ref.current = bindings;

  useEffect(() => {
    if (!enabled) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      const parts: string[] = [];
      if (event.metaKey || event.ctrlKey) parts.push('mod');
      if (event.shiftKey) parts.push('shift');
      if (event.altKey) parts.push('alt');
      parts.push(event.key.toLowerCase());
      const combo = parts.join('+');

      const handler = ref.current[combo];
      if (!handler) return;
      if (!event.metaKey && !event.ctrlKey && isTypingTarget(event.target)) return;

      event.preventDefault();
      handler(event);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
}
