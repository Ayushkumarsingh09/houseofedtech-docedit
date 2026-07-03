"use client";

import { useEffect } from "react";

import { syncEngine } from "@/lib/sync-engine/sync-engine";
import { useSyncStore } from "@/stores/sync-store";

/** Boots the sync engine once for the lifetime of the authenticated shell. */
export function useSyncLifecycle() {
  const setState = useSyncStore((s) => s.setState);

  useEffect(() => {
    const unsubscribeState = syncEngine.subscribe(setState);
    const stopEngine = syncEngine.start();

    return () => {
      unsubscribeState();
      stopEngine();
    };
  }, [setState]);
}
