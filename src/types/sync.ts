import type { OperationTypeName } from "@/constants";

/**
 * A single, immutable edit produced on a client. Operations are the unit of
 * synchronization — every field is required for the server to be able to
 * order, deduplicate, verify, and deterministically merge concurrent edits.
 */
export interface SyncOperation {
  /** Client-generated UUID. Guarantees idempotent replays. */
  operationId: string;
  /** Stable per-browser-tab identifier (persisted in Dexie). */
  clientId: string;
  documentId: string;
  userId: string;
  type: OperationTypeName;
  payload: OperationPayload;
  /** Document version this operation was created against. */
  baseVersion: number;
  /** Monotonic counter, per (clientId, documentId). */
  sequenceNumber: number;
  /** ISO timestamp, set on the client when the op was recorded. */
  clientTimestamp: string;
  /** SHA-256 hex digest of a canonical JSON encoding of the op (integrity). */
  hash: string;
}

export type OperationPayload =
  | { kind: "insert"; position: number; text: string }
  | { kind: "delete"; position: number; length: number; deletedText?: string }
  | {
      kind: "replace";
      position: number;
      length: number;
      text: string;
      deletedText?: string;
    }
  | { kind: "set_content"; content: string; contentJson?: unknown }
  | { kind: "rename"; title: string };

export type OperationStatus = "APPLIED" | "REJECTED" | "CONFLICT_RESOLVED";

export interface AppliedOperationResult {
  operationId: string;
  status: OperationStatus;
  resultVersion: number | null;
  conflictResolution?: ConflictResolutionInfo;
  reason?: string;
}

export interface ConflictResolutionInfo {
  strategy: "rebase" | "last-write-wins" | "merge";
  transformedAgainst: number;
  description: string;
}

export interface SyncPushRequest {
  documentId: string;
  operations: SyncOperation[];
}

export interface SyncPushResponse {
  results: AppliedOperationResult[];
  serverVersion: number;
  serverContent: string;
}

export interface SyncPullRequest {
  documentId: string;
  /** Last version the client has observed; server returns everything after. */
  sinceVersion: number;
}

export interface SyncPullResponse {
  documentId: string;
  currentVersion: number;
  content: string;
  contentJson: unknown;
  operations: ServerOperationRecord[];
  updatedAt: string;
}

export interface ServerOperationRecord {
  operationId: string;
  clientId: string;
  userId: string;
  type: OperationTypeName;
  payload: OperationPayload;
  resultVersion: number;
  serverTimestamp: string;
  status: OperationStatus;
}

export type NetworkStatus = "online" | "offline";
export type SyncPhase = "idle" | "syncing" | "error" | "offline";

export interface SyncEngineState {
  networkStatus: NetworkStatus;
  phase: SyncPhase;
  pendingCount: number;
  lastSyncedAt: string | null;
  lastError: string | null;
}
