import { create } from "zustand";

import type { SyncEngineState } from "@/types/sync";

const initialState: SyncEngineState = {
  networkStatus: "online",
  phase: "idle",
  pendingCount: 0,
  lastSyncedAt: null,
  lastError: null,
};

interface SyncStoreState extends SyncEngineState {
  setState: (state: SyncEngineState) => void;
}

export const useSyncStore = create<SyncStoreState>((set) => ({
  ...initialState,
  setState: (state) => set(state),
}));
