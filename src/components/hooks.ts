import { useEffect, useLayoutEffect, useRef } from 'react';

export function useClickOutside<T extends HTMLElement>(
  onOutside: () => void,
  enabled = true
) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const handler = (event: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(event.target as Node)) onOutside();
    };

    // Deferred so the click that opened the element does not close it.
    const id = window.setTimeout(() => {
      document.addEventListener('mousedown', handler);
    }, 0);

    return () => {
      window.clearTimeout(id);
      document.removeEventListener('mousedown', handler);
    };
  }, [onOutside, enabled]);

  return ref;
}

export function useOnEscape(onEscape: () => void, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;

    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onEscape();
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onEscape, enabled]);
}

/** Grows a textarea to fit its content so long bullets stay readable. */
export function useAutoResize(value: string) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return ref;
}
