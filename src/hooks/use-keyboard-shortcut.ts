"use client";

import { useEffect } from "react";

interface ShortcutOptions {
  key: string;
  meta?: boolean;
  shift?: boolean;
  handler: (event: KeyboardEvent) => void;
  enabled?: boolean;
}

export function useKeyboardShortcut({
  key,
  meta = false,
  shift = false,
  handler,
  enabled = true,
}: ShortcutOptions) {
  useEffect(() => {
    if (!enabled) return;

    function onKeyDown(event: KeyboardEvent) {
      const metaMatches = meta ? event.metaKey || event.ctrlKey : true;
      const shiftMatches = shift ? event.shiftKey : !event.shiftKey || !shift;
      if (event.key.toLowerCase() === key.toLowerCase() && metaMatches && shiftMatches) {
        event.preventDefault();
        handler(event);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [key, meta, shift, handler, enabled]);
}
