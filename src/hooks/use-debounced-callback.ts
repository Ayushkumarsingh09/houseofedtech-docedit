"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Returns a stable, debounced version of `callback`. Used on the editor's
 * hot path (every keystroke) so that expensive work — diffing, hashing, and
 * writing to IndexedDB — runs at most once per `delayMs`, which is what
 * keeps typing perfectly smooth even during rapid input.
 */
export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delayMs: number,
): (...args: Args) => void {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  return useCallback(
    (...args: Args) => {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => callbackRef.current(...args), delayMs);
    },
    [delayMs],
  );
}
