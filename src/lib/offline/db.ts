import Dexie, { type EntityTable } from "dexie";

import type { RoleName } from "@/constants";
import type { OperationTypeName } from "@/constants";
import type { OperationPayload } from "@/types/sync";

/**
 * The local IndexedDB database — the *source of truth* for the app while
 * offline. Every read the UI performs goes through Dexie first; the network
 * is only ever a background reconciliation channel (see
 * `src/lib/sync-engine/sync-engine.ts`).
 */

export interface LocalDocument {
  id: string;
  title: string;
  content: string;
  contentJson: unknown;
  role: RoleName;
  ownerId: string;
  ownerName: string;
  /** Last version number this client has confirmed from the server. */
  serverVersion: number;
  isArchived: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  /** True while there are un-synced local edits for this document. */
  isDirty: boolean;
  /** True once at least one full pull has completed for this document. */
  isHydrated: boolean;
}

export type OutboxStatus = "pending" | "sending" | "failed";

export interface OutboxOperation {
  /** Dexie primary key — identical to `operationId` for O(1) idempotent upserts. */
  operationId: string;
  clientId: string;
  documentId: string;
  userId: string;
  type: OperationTypeName;
  payload: OperationPayload;
  baseVersion: number;
  sequenceNumber: number;
  clientTimestamp: string;
  hash: string;
  status: OutboxStatus;
  retryCount: number;
  nextRetryAt: number;
  lastError?: string;
  createdAt: number;
}

export interface LocalVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  label: string | null;
  isAutomatic: boolean;
  createdAt: string;
  createdByName: string;
  changesSummary: { insertions: number; deletions: number; charCount: number } | null;
  /** Populated lazily when the user opens the diff/preview for this entry. */
  content?: string;
}

export interface MetaEntry {
  key: string;
  value: unknown;
}

class NimbusDatabase extends Dexie {
  documents!: EntityTable<LocalDocument, "id">;
  outbox!: EntityTable<OutboxOperation, "operationId">;
  versions!: EntityTable<LocalVersion, "id">;
  meta!: EntityTable<MetaEntry, "key">;

  constructor() {
    super("nimbus-docs");

    this.version(1).stores({
      documents: "id, updatedAt, isDirty, isArchived",
      outbox:
        "operationId, documentId, status, sequenceNumber, [documentId+sequenceNumber]",
      versions: "id, documentId, versionNumber, [documentId+versionNumber]",
      meta: "key",
    });
  }
}

export const db = new NimbusDatabase();

const CLIENT_ID_KEY = "nimbus:clientId";

/** Stable per-browser-tab-storage identifier, persisted across reloads. */
export async function getOrCreateClientId(): Promise<string> {
  const existing = await db.meta.get(CLIENT_ID_KEY);
  if (existing) return existing.value as string;

  const id = crypto.randomUUID();
  await db.meta.put({ key: CLIENT_ID_KEY, value: id });
  return id;
}
