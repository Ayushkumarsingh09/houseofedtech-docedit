import { sha256Hex, canonicalJSONStringify } from "@/lib/crypto";
import { db, getOrCreateClientId, type OutboxOperation } from "@/lib/offline/db";
import type { OperationTypeName } from "@/constants";
import type { OperationPayload, SyncOperation } from "@/types/sync";

/**
 * The durable, IndexedDB-backed outbox. Every local edit is appended here
 * *synchronously* (before any network attempt), which is what allows the UI
 * to never block on connectivity: writes always succeed locally first.
 */

const sequenceCounters = new Map<string, number>();

async function nextSequenceNumber(documentId: string): Promise<number> {
  if (!sequenceCounters.has(documentId)) {
    const last = await db.outbox.where("documentId").equals(documentId).last();
    sequenceCounters.set(documentId, last ? last.sequenceNumber : 0);
  }
  const next = (sequenceCounters.get(documentId) ?? 0) + 1;
  sequenceCounters.set(documentId, next);
  return next;
}

export async function enqueueOperation(params: {
  documentId: string;
  userId: string;
  type: OperationTypeName;
  payload: OperationPayload;
  baseVersion: number;
}): Promise<OutboxOperation> {
  const [clientId, sequenceNumber] = await Promise.all([
    getOrCreateClientId(),
    nextSequenceNumber(params.documentId),
  ]);

  const operationId = crypto.randomUUID();
  const clientTimestamp = new Date().toISOString();

  const hash = await sha256Hex(
    canonicalJSONStringify({
      operationId,
      clientId,
      documentId: params.documentId,
      userId: params.userId,
      type: params.type,
      payload: params.payload,
      baseVersion: params.baseVersion,
      sequenceNumber,
      clientTimestamp,
    }),
  );

  const operation: OutboxOperation = {
    operationId,
    clientId,
    documentId: params.documentId,
    userId: params.userId,
    type: params.type,
    payload: params.payload,
    baseVersion: params.baseVersion,
    sequenceNumber,
    clientTimestamp,
    hash,
    status: "pending",
    retryCount: 0,
    nextRetryAt: 0,
    createdAt: Date.now(),
  };

  await db.outbox.put(operation);
  return operation;
}

export async function getPendingBatch(
  documentId: string,
  limit: number,
): Promise<OutboxOperation[]> {
  const now = Date.now();
  const ops = await db.outbox
    .where("documentId")
    .equals(documentId)
    .and((op) => op.status !== "sending" && op.nextRetryAt <= now)
    .sortBy("sequenceNumber");
  return ops.slice(0, limit);
}

export async function getPendingCount(documentId?: string): Promise<number> {
  if (documentId) {
    return db.outbox
      .where("documentId")
      .equals(documentId)
      .and((op) => op.status !== "sending")
      .count();
  }
  return db.outbox.count();
}

export async function markSending(operationIds: string[]): Promise<void> {
  await db.outbox.where("operationId").anyOf(operationIds).modify({ status: "sending" });
}

export async function removeOperations(operationIds: string[]): Promise<void> {
  await db.outbox.bulkDelete(operationIds);
}

export async function markFailed(
  operationId: string,
  error: string,
  nextRetryAt: number,
): Promise<void> {
  await db.outbox.update(operationId, {
    status: "failed",
    lastError: error,
    nextRetryAt,
    retryCount: ((await db.outbox.get(operationId))?.retryCount ?? 0) + 1,
  });
}

export function toWireFormat(op: OutboxOperation): SyncOperation {
  return {
    operationId: op.operationId,
    clientId: op.clientId,
    documentId: op.documentId,
    userId: op.userId,
    type: op.type,
    payload: op.payload,
    baseVersion: op.baseVersion,
    sequenceNumber: op.sequenceNumber,
    clientTimestamp: op.clientTimestamp,
    hash: op.hash,
  };
}

export function resetSequenceCache(documentId?: string): void {
  if (documentId) sequenceCounters.delete(documentId);
  else sequenceCounters.clear();
}
