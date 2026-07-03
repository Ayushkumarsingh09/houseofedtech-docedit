import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { sha256Hex } from "@/lib/crypto";
import { ForbiddenError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { pullOperations, pushOperations } from "@/services/sync.service";
import type { OperationPayload, SyncOperation } from "@/types/sync";

/**
 * End-to-end integration test for the sync engine's server side: pushes
 * concurrent operations from two simulated clients against the same
 * document and asserts the merge is deterministic and lossless. Runs
 * against a real Postgres database (see `DATABASE_URL`).
 */
describe.skipIf(!process.env.DATABASE_URL?.startsWith("postgres"))(
  "sync.service integration",
  () => {
    let ownerId: string;
    let viewerId: string;
    let documentId: string;

    async function buildOperation(params: {
      documentId: string;
      userId: string;
      clientId: string;
      sequenceNumber: number;
      baseVersion: number;
      payload: OperationPayload;
    }): Promise<SyncOperation> {
      const operationId = randomUUID();
      const clientTimestamp = new Date().toISOString();
      const hash = await sha256Hex(
        JSON.stringify({ operationId, ...params, clientTimestamp }),
      );
      return {
        operationId,
        clientId: params.clientId,
        documentId: params.documentId,
        userId: params.userId,
        type: params.payload.kind.toUpperCase() as SyncOperation["type"],
        payload: params.payload,
        baseVersion: params.baseVersion,
        sequenceNumber: params.sequenceNumber,
        clientTimestamp,
        hash,
      };
    }

    beforeAll(async () => {
      const owner = await prisma.user.create({
        data: {
          name: "Integration Owner",
          email: `owner-${randomUUID()}@test.local`,
          passwordHash: "not-a-real-hash",
        },
      });
      const viewer = await prisma.user.create({
        data: {
          name: "Integration Viewer",
          email: `viewer-${randomUUID()}@test.local`,
          passwordHash: "not-a-real-hash",
        },
      });
      ownerId = owner.id;
      viewerId = viewer.id;

      const document = await prisma.document.create({
        data: { title: "Integration test doc", ownerId, content: "The quick brown fox" },
      });
      documentId = document.id;

      await prisma.collaborator.create({
        data: { documentId, userId: viewerId, role: "VIEWER" },
      });
    });

    afterAll(async () => {
      await prisma.operation.deleteMany({ where: { documentId } });
      await prisma.version.deleteMany({ where: { documentId } });
      await prisma.snapshot.deleteMany({ where: { documentId } });
      await prisma.collaborator.deleteMany({ where: { documentId } });
      await prisma.document.deleteMany({ where: { id: documentId } });
      await prisma.user.deleteMany({ where: { id: { in: [ownerId, viewerId] } } });
      await prisma.$disconnect();
    });

    it("applies a single client's operation and advances the document version", async () => {
      const op = await buildOperation({
        documentId,
        userId: ownerId,
        clientId: "client-A",
        sequenceNumber: 1,
        baseVersion: 0,
        payload: { kind: "insert", position: 19, text: "!" },
      });

      const result = await pushOperations(ownerId, documentId, [op]);

      expect(result.results[0]).toMatchObject({
        operationId: op.operationId,
        status: "APPLIED",
      });
      expect(result.serverContent).toBe("The quick brown fox!");
      expect(result.serverVersion).toBe(1);
    });

    it("deterministically merges concurrent edits from two clients without data loss", async () => {
      // Both clients branch from version 1 ("The quick brown fox!").
      const clientAOp = await buildOperation({
        documentId,
        userId: ownerId,
        clientId: "client-A",
        sequenceNumber: 2,
        baseVersion: 1,
        payload: { kind: "insert", position: 0, text: "[A] " },
      });
      const clientBOp = await buildOperation({
        documentId,
        userId: ownerId,
        clientId: "client-B",
        sequenceNumber: 1,
        baseVersion: 1,
        payload: { kind: "insert", position: 21, text: " [B]" },
      });

      await pushOperations(ownerId, documentId, [clientAOp]);
      const second = await pushOperations(ownerId, documentId, [clientBOp]);

      // Client B's insert must be rebased 4 characters to the right (the
      // length of "[A] ") because client A's edit landed first on the server.
      expect(second.serverContent).toBe("[A] The quick brown fox! [B]");
      expect(second.results[0]?.status).toBe("CONFLICT_RESOLVED");
    });

    it("is idempotent: replaying an already-applied operation does not double-apply it", async () => {
      const before = await prisma.document.findUniqueOrThrow({
        where: { id: documentId },
      });

      const op = await buildOperation({
        documentId,
        userId: ownerId,
        clientId: "client-A",
        sequenceNumber: 3,
        baseVersion: before.version,
        payload: { kind: "insert", position: 0, text: "DUPLICATE-" },
      });

      const first = await pushOperations(ownerId, documentId, [op]);
      const replay = await pushOperations(ownerId, documentId, [op]);

      expect(replay.serverVersion).toBe(first.serverVersion);
      expect(replay.serverContent).toBe(first.serverContent);
      expect(replay.serverContent.match(/DUPLICATE-/g)).toHaveLength(1);
    });

    it("rejects pushes from a viewer", async () => {
      const op = await buildOperation({
        documentId,
        userId: viewerId,
        clientId: "client-viewer",
        sequenceNumber: 1,
        baseVersion: 0,
        payload: { kind: "insert", position: 0, text: "hacked" },
      });

      await expect(pushOperations(viewerId, documentId, [op])).rejects.toThrow(
        ForbiddenError,
      );
    });

    it("allows a viewer to pull the latest state", async () => {
      const result = await pullOperations(viewerId, documentId, 0);
      expect(result.currentVersion).toBeGreaterThan(0);
      expect(typeof result.content).toBe("string");
    });
  },
);
