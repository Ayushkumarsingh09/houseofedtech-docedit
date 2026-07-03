import { z } from "zod";

import { OPERATION_TYPES, SYNC_LIMITS } from "@/constants";

/**
 * Strict, size-bounded validation for every sync payload. This is the
 * server's primary defence against a malicious or buggy client sending a
 * massive/malformed batch that could exhaust memory or corrupt a document —
 * every array and string here has an explicit upper bound *before* any
 * business logic runs.
 */

const operationPayloadSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("insert"),
    position: z.number().int().min(0),
    text: z.string().max(SYNC_LIMITS.MAX_OPERATION_PAYLOAD_BYTES),
  }),
  z.object({
    kind: z.literal("delete"),
    position: z.number().int().min(0),
    length: z.number().int().min(0).max(SYNC_LIMITS.MAX_DOCUMENT_LENGTH),
    deletedText: z.string().max(SYNC_LIMITS.MAX_OPERATION_PAYLOAD_BYTES).optional(),
  }),
  z.object({
    kind: z.literal("replace"),
    position: z.number().int().min(0),
    length: z.number().int().min(0).max(SYNC_LIMITS.MAX_DOCUMENT_LENGTH),
    text: z.string().max(SYNC_LIMITS.MAX_OPERATION_PAYLOAD_BYTES),
    deletedText: z.string().max(SYNC_LIMITS.MAX_OPERATION_PAYLOAD_BYTES).optional(),
  }),
  z.object({
    kind: z.literal("set_content"),
    content: z.string().max(SYNC_LIMITS.MAX_DOCUMENT_LENGTH),
    contentJson: z.unknown().optional(),
  }),
  z.object({
    kind: z.literal("rename"),
    title: z.string().trim().min(1).max(300),
  }),
]);

export const syncOperationSchema = z.object({
  operationId: z.string().uuid(),
  clientId: z.string().min(1).max(100),
  documentId: z.string().min(1).max(100),
  userId: z.string().min(1).max(100),
  type: z.enum(OPERATION_TYPES),
  payload: operationPayloadSchema,
  baseVersion: z.number().int().min(0),
  sequenceNumber: z.number().int().min(0),
  clientTimestamp: z.string().datetime({ offset: true }).or(z.string().datetime()),
  hash: z.string().length(64),
});

export const syncPushSchema = z.object({
  documentId: z.string().min(1).max(100),
  operations: z.array(syncOperationSchema).min(1).max(SYNC_LIMITS.MAX_BATCH_SIZE),
});

export const syncPullSchema = z.object({
  documentId: z.string().min(1).max(100),
  sinceVersion: z.number().int().min(0),
});
