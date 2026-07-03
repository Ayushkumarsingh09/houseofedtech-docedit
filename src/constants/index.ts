/** Central place for magic numbers / strings shared across the codebase. */

export const ROLES = ["OWNER", "EDITOR", "VIEWER"] as const;
export type RoleName = (typeof ROLES)[number];

/** Roles ranked by privilege, highest first — used for comparisons. */
export const ROLE_RANK: Record<RoleName, number> = {
  OWNER: 3,
  EDITOR: 2,
  VIEWER: 1,
};

export const OPERATION_TYPES = [
  "INSERT",
  "DELETE",
  "REPLACE",
  "RENAME",
  "SET_CONTENT",
] as const;
export type OperationTypeName = (typeof OPERATION_TYPES)[number];

/** Hard caps that protect the server from malformed/oversized sync payloads. */
export const SYNC_LIMITS = {
  /** Maximum number of operations accepted in a single push batch. */
  MAX_BATCH_SIZE: 200,
  /** Maximum serialized size (bytes) of a single operation payload. */
  MAX_OPERATION_PAYLOAD_BYTES: 64 * 1024, // 64 KB
  /** Maximum serialized size (bytes) of an entire push request body. */
  MAX_REQUEST_BODY_BYTES: 2 * 1024 * 1024, // 2 MB
  /** Maximum length (characters) of a document's full content. */
  MAX_DOCUMENT_LENGTH: 2_000_000, // ~2M chars (~4MB UTF-16)
  /** Maximum number of pull results returned per request. */
  MAX_PULL_PAGE_SIZE: 500,
} as const;

export const AUTOSAVE_DEBOUNCE_MS = 600;
export const SYNC_POLL_INTERVAL_MS = 15_000;
export const SYNC_RETRY_BASE_DELAY_MS = 1_000;
export const SYNC_RETRY_MAX_DELAY_MS = 30_000;
export const SYNC_RETRY_MAX_ATTEMPTS = 8;

export const AUTO_SNAPSHOT_OPERATION_INTERVAL = 25;
export const AUTO_SNAPSHOT_TIME_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export const COOKIE_NAMES = {
  ACCESS_TOKEN: "nimbus_at",
  REFRESH_TOKEN: "nimbus_rt",
} as const;

export const RATE_LIMITS = {
  AUTH: { windowMs: 60_000, max: 20 },
  SYNC: { windowMs: 60_000, max: 120 },
  AI: { windowMs: 60_000, max: 20 },
  DEFAULT: { windowMs: 60_000, max: 240 },
} as const;

export const APP_NAME = "Nimbus Docs";
export const APP_DESCRIPTION =
  "A local-first, offline-capable collaborative document editor with deterministic conflict resolution and Git-like version history.";
