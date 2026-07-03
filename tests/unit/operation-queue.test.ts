import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/lib/offline/db";
import {
  enqueueOperation,
  getPendingBatch,
  getPendingCount,
  markSending,
  removeOperations,
  toWireFormat,
} from "@/lib/sync-engine/operation-queue";

describe("operation-queue (Dexie outbox)", () => {
  beforeEach(async () => {
    await db.outbox.clear();
    await db.meta.clear();
  });

  it("persists enqueued operations to IndexedDB with monotonic sequence numbers", async () => {
    const documentId = "doc-1";
    const first = await enqueueOperation({
      documentId,
      userId: "user-1",
      type: "INSERT",
      payload: { kind: "insert", position: 0, text: "a" },
      baseVersion: 0,
    });
    const second = await enqueueOperation({
      documentId,
      userId: "user-1",
      type: "INSERT",
      payload: { kind: "insert", position: 1, text: "b" },
      baseVersion: 0,
    });

    expect(second.sequenceNumber).toBe(first.sequenceNumber + 1);
    expect(await db.outbox.count()).toBe(2);
  });

  it("assigns a stable clientId across multiple operations", async () => {
    const documentId = "doc-2";
    const first = await enqueueOperation({
      documentId,
      userId: "user-1",
      type: "INSERT",
      payload: { kind: "insert", position: 0, text: "a" },
      baseVersion: 0,
    });
    const second = await enqueueOperation({
      documentId,
      userId: "user-1",
      type: "INSERT",
      payload: { kind: "insert", position: 1, text: "b" },
      baseVersion: 0,
    });

    expect(first.clientId).toBe(second.clientId);
  });

  it("computes an integrity hash for every operation", async () => {
    const op = await enqueueOperation({
      documentId: "doc-3",
      userId: "user-1",
      type: "INSERT",
      payload: { kind: "insert", position: 0, text: "a" },
      baseVersion: 0,
    });
    expect(op.hash).toHaveLength(64);
  });

  it("retrieves pending batches in sequence order, excluding in-flight operations", async () => {
    const documentId = "doc-4";
    for (let i = 0; i < 3; i++) {
      await enqueueOperation({
        documentId,
        userId: "user-1",
        type: "INSERT",
        payload: { kind: "insert", position: i, text: String(i) },
        baseVersion: 0,
      });
    }

    const batch = await getPendingBatch(documentId, 10);
    expect(batch).toHaveLength(3);
    expect(batch.map((op) => op.sequenceNumber)).toEqual([1, 2, 3]);

    await markSending([batch[0]!.operationId]);
    const remaining = await getPendingBatch(documentId, 10);
    expect(remaining).toHaveLength(2);
  });

  it("removes operations once they are confirmed synced", async () => {
    const documentId = "doc-5";
    const op = await enqueueOperation({
      documentId,
      userId: "user-1",
      type: "INSERT",
      payload: { kind: "insert", position: 0, text: "a" },
      baseVersion: 0,
    });

    expect(await getPendingCount(documentId)).toBe(1);
    await removeOperations([op.operationId]);
    expect(await getPendingCount(documentId)).toBe(0);
  });

  it("serializes to the wire format expected by the sync API", async () => {
    const op = await enqueueOperation({
      documentId: "doc-6",
      userId: "user-1",
      type: "RENAME",
      payload: { kind: "rename", title: "New title" },
      baseVersion: 2,
    });

    const wire = toWireFormat(op);
    expect(wire).toMatchObject({
      documentId: "doc-6",
      userId: "user-1",
      type: "RENAME",
      baseVersion: 2,
      payload: { kind: "rename", title: "New title" },
    });
  });
});
