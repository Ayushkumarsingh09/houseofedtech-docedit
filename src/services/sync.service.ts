import type { Prisma } from "@prisma/client";

import { AUTO_SNAPSHOT_OPERATION_INTERVAL } from "@/constants";
import { sha256Hex } from "@/lib/crypto";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { sanitizeHtml } from "@/lib/sanitize";
import {
  applyPayload,
  transformPayload,
  type DocumentState,
} from "@/lib/sync-engine/conflict-resolver";
import { accessRepository } from "@/repositories/access.repository";
import { auditLogRepository } from "@/repositories/audit-log.repository";
import { operationRepository } from "@/repositories/operation.repository";
import { versionRepository } from "@/repositories/version.repository";
import { assertRole } from "@/services/document.service";
import type {
  SyncOperation,
  AppliedOperationResult,
  ServerOperationRecord,
} from "@/types/sync";
import { SYNC_LIMITS } from "@/constants";

const MAX_CONCURRENCY_RETRIES = 5;

interface HistoryEntry {
  resultVersion: number;
  payload: SyncOperation["payload"];
}

/**
 * Applies one incoming batch of operations to a document, using the OT
 * engine in `conflict-resolver.ts` to reconcile against every change that
 * landed on the server since each operation's `baseVersion`.
 *
 * The whole batch is wrapped in a single retryable optimistic-concurrency
 * loop: if another request mutates the document between our read and our
 * write, we re-read the latest state and re-run the transform from scratch
 * rather than silently overwriting the other write (classic
 * check-then-act race, closed here by an atomic `UPDATE ... WHERE version =
 * $expected`).
 */
export async function pushOperations(
  userId: string,
  documentId: string,
  operations: SyncOperation[],
): Promise<{
  results: AppliedOperationResult[];
  serverVersion: number;
  serverContent: string;
}> {
  const role = await accessRepository.getRoleForDocument(userId, documentId);
  assertRole(role, "EDITOR");

  for (const op of operations) {
    if (op.documentId !== documentId) {
      throw new ValidationError(
        "All operations in a batch must target the same document.",
      );
    }
  }

  for (let attempt = 0; attempt < MAX_CONCURRENCY_RETRIES; attempt++) {
    try {
      return await attemptPush(userId, documentId, operations);
    } catch (error) {
      if (
        error instanceof OptimisticConcurrencyError &&
        attempt < MAX_CONCURRENCY_RETRIES - 1
      ) {
        continue;
      }
      throw error;
    }
  }

  throw new ValidationError(
    "Unable to apply changes after multiple attempts. Please retry.",
  );
}

class OptimisticConcurrencyError extends Error {}

async function attemptPush(
  userId: string,
  documentId: string,
  operations: SyncOperation[],
) {
  const document = await prisma.document.findUnique({ where: { id: documentId } });
  if (!document || document.isDeleted) throw new NotFoundError("Document");

  // Idempotency: operations we've already recorded are reported back with
  // their original outcome instead of being reapplied.
  const existing = await operationRepository.findManyByOperationIds(
    operations.map((o) => o.operationId),
  );
  const existingByOperationId = new Map(existing.map((row) => [row.operationId, row]));
  const newOperations = operations
    .filter((op) => !existingByOperationId.has(op.operationId))
    .sort((a, b) => a.sequenceNumber - b.sequenceNumber);

  const replayResults: AppliedOperationResult[] = operations
    .filter((op) => existingByOperationId.has(op.operationId))
    .map((op) => {
      const row = existingByOperationId.get(op.operationId);
      return {
        operationId: op.operationId,
        status: row?.status ?? "APPLIED",
        resultVersion: row?.resultVersion ?? null,
      };
    });

  if (newOperations.length === 0) {
    return {
      results: replayResults,
      serverVersion: document.version,
      serverContent: document.content,
    };
  }

  const minBaseVersion = Math.min(...newOperations.map((op) => op.baseVersion));
  const historyRows = await operationRepository.listSince(
    documentId,
    minBaseVersion,
    5000,
  );
  const history: HistoryEntry[] = historyRows
    .filter(
      (row): row is typeof row & { resultVersion: number } => row.resultVersion !== null,
    )
    .map((row) => ({
      resultVersion: row.resultVersion,
      payload: row.payload as SyncOperation["payload"],
    }));

  let state: DocumentState = { content: document.content, title: document.title };
  let workingVersion = document.version;
  const newResults: AppliedOperationResult[] = [];
  const operationCreates: Prisma.OperationUncheckedCreateInput[] = [];

  for (const op of newOperations) {
    if (op.baseVersion > workingVersion) {
      newResults.push({
        operationId: op.operationId,
        status: "REJECTED",
        resultVersion: null,
        reason: "Operation references a version that does not exist yet.",
      });
      continue;
    }

    const relevantHistory = history.filter((h) => h.resultVersion > op.baseVersion);
    let transformedPayload = op.payload;
    let wasTransformed = false;

    for (const entry of relevantHistory) {
      const result = transformPayload(
        transformedPayload,
        entry.payload,
        state.content.length,
      );
      transformedPayload = result.payload;
      wasTransformed = wasTransformed || result.wasTransformed;
    }

    if (transformedPayload.kind === "rename") {
      transformedPayload = {
        ...transformedPayload,
        title: sanitizeHtml(transformedPayload.title).slice(0, 300),
      };
    }
    if (transformedPayload.kind === "insert" || transformedPayload.kind === "replace") {
      const cappedText = transformedPayload.text.slice(
        0,
        SYNC_LIMITS.MAX_OPERATION_PAYLOAD_BYTES,
      );
      transformedPayload = {
        ...transformedPayload,
        text: cappedText,
      } as typeof transformedPayload;
    }

    const nextState = applyPayload(state, transformedPayload);
    if (nextState.content.length > SYNC_LIMITS.MAX_DOCUMENT_LENGTH) {
      newResults.push({
        operationId: op.operationId,
        status: "REJECTED",
        resultVersion: null,
        reason: "This change would exceed the maximum document size.",
      });
      continue;
    }

    state = nextState;
    workingVersion += 1;
    history.push({ resultVersion: workingVersion, payload: transformedPayload });

    const hash = await sha256Hex(JSON.stringify(transformedPayload));
    operationCreates.push({
      operationId: op.operationId,
      clientId: op.clientId,
      documentId,
      userId,
      type: op.type,
      payload: transformedPayload as unknown as Prisma.InputJsonValue,
      baseVersion: op.baseVersion,
      resultVersion: workingVersion,
      sequenceNumber: op.sequenceNumber,
      clientTimestamp: new Date(op.clientTimestamp),
      hash,
      status: wasTransformed ? "CONFLICT_RESOLVED" : "APPLIED",
      conflictResolution: (wasTransformed
        ? {
            strategy: "rebase",
            transformedAgainst: relevantHistory.length,
            description: "Rebased against concurrent edits.",
          }
        : undefined) as Prisma.InputJsonValue | undefined,
    });

    newResults.push({
      operationId: op.operationId,
      status: wasTransformed ? "CONFLICT_RESOLVED" : "APPLIED",
      resultVersion: workingVersion,
      conflictResolution: wasTransformed
        ? {
            strategy: "rebase",
            transformedAgainst: relevantHistory.length,
            description: "Rebased against concurrent edits.",
          }
        : undefined,
    });
  }

  if (operationCreates.length === 0) {
    return {
      results: [...replayResults, ...newResults],
      serverVersion: document.version,
      serverContent: document.content,
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const updated = await tx.document.updateMany({
        where: { id: documentId, version: document.version },
        data: { version: workingVersion, content: state.content, title: state.title },
      });
      if (updated.count === 0) {
        throw new OptimisticConcurrencyError();
      }
      await tx.operation.createMany({ data: operationCreates });
    });
  } catch (error) {
    if (error instanceof OptimisticConcurrencyError) throw error;
    throw error;
  }

  const totalOperationCount = await operationRepository.countForDocument(documentId);
  if (
    Math.floor(totalOperationCount / AUTO_SNAPSHOT_OPERATION_INTERVAL) >
    Math.floor(
      (totalOperationCount - operationCreates.length) / AUTO_SNAPSHOT_OPERATION_INTERVAL,
    )
  ) {
    await createAutomaticSnapshot(userId, documentId, state.content);
  }

  await auditLogRepository.record({
    userId,
    documentId,
    action: "sync.push",
    metadata: { operationCount: operationCreates.length, resultVersion: workingVersion },
  });

  return {
    results: [...replayResults, ...newResults],
    serverVersion: workingVersion,
    serverContent: state.content,
  };
}

async function createAutomaticSnapshot(
  userId: string,
  documentId: string,
  content: string,
) {
  const hash = await sha256Hex(content);
  await versionRepository.createWithSnapshot({
    documentId,
    createdById: userId,
    isAutomatic: true,
    content,
    contentJson: undefined,
    hash,
    changesSummary: undefined,
  });
}

export async function pullOperations(
  userId: string,
  documentId: string,
  sinceVersion: number,
): Promise<{
  documentId: string;
  currentVersion: number;
  content: string;
  contentJson: unknown;
  operations: ServerOperationRecord[];
  updatedAt: string;
}> {
  const role = await accessRepository.getRoleForDocument(userId, documentId);
  if (!role) throw new ForbiddenError("You do not have access to this document.");

  const document = await prisma.document.findUnique({ where: { id: documentId } });
  if (!document || document.isDeleted) throw new NotFoundError("Document");

  const operations = await operationRepository.listSince(
    documentId,
    sinceVersion,
    SYNC_LIMITS.MAX_PULL_PAGE_SIZE,
  );

  return {
    documentId,
    currentVersion: document.version,
    content: document.content,
    contentJson: document.contentJson,
    updatedAt: document.updatedAt.toISOString(),
    operations: operations.map((op) => ({
      operationId: op.operationId,
      clientId: op.clientId,
      userId: op.userId,
      type: op.type,
      payload: op.payload as SyncOperation["payload"],
      resultVersion: op.resultVersion ?? 0,
      serverTimestamp: op.serverTimestamp.toISOString(),
      status: op.status,
    })),
  };
}
