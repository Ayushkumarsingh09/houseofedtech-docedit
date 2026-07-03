import { diffChars } from "diff";

import { sha256Hex } from "@/lib/crypto";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { accessRepository } from "@/repositories/access.repository";
import { auditLogRepository } from "@/repositories/audit-log.repository";
import { documentRepository } from "@/repositories/document.repository";
import { versionRepository } from "@/repositories/version.repository";
import { assertRole } from "@/services/document.service";
import type { CreateVersionInput } from "@/schemas/document.schema";
import type { VersionDetail, VersionSummary } from "@/types/document";

function toSummary(v: {
  id: string;
  versionNumber: number;
  label: string | null;
  isAutomatic: boolean;
  createdAt: Date;
  createdBy: { name: string };
  changesSummary: unknown;
}): VersionSummary {
  return {
    id: v.id,
    versionNumber: v.versionNumber,
    label: v.label,
    isAutomatic: v.isAutomatic,
    createdAt: v.createdAt.toISOString(),
    createdByName: v.createdBy.name,
    changesSummary: v.changesSummary as VersionSummary["changesSummary"],
  };
}

function computeChangesSummary(previous: string, next: string) {
  const parts = diffChars(previous, next);
  let insertions = 0;
  let deletions = 0;
  for (const part of parts) {
    if (part.added) insertions += part.value.length;
    if (part.removed) deletions += part.value.length;
  }
  return { insertions, deletions, charCount: next.length };
}

export const versionService = {
  async list(userId: string, documentId: string): Promise<VersionSummary[]> {
    const role = await accessRepository.getRoleForDocument(userId, documentId);
    assertRole(role, "VIEWER");
    const versions = await versionRepository.listForDocument(documentId);
    return versions.map(toSummary);
  },

  async get(
    userId: string,
    documentId: string,
    versionId: string,
  ): Promise<VersionDetail> {
    const role = await accessRepository.getRoleForDocument(userId, documentId);
    assertRole(role, "VIEWER");

    const version = await versionRepository.findById(versionId);
    if (!version || version.documentId !== documentId) throw new NotFoundError("Version");

    return { ...toSummary(version), content: version.snapshot.content };
  },

  async createSnapshot(
    userId: string,
    documentId: string,
    input: CreateVersionInput,
    isAutomatic = false,
  ) {
    const role = await accessRepository.getRoleForDocument(userId, documentId);
    assertRole(role, "EDITOR");

    const document = await documentRepository.findById(documentId);
    if (!document) throw new NotFoundError("Document");

    const previousContent = await versionRepository.getLatestSnapshotContent(documentId);

    const hash = await sha256Hex(document.content);
    const version = await versionRepository.createWithSnapshot({
      documentId,
      createdById: userId,
      label: input.label,
      isAutomatic,
      content: document.content,
      contentJson: document.contentJson ?? undefined,
      hash,
      changesSummary: computeChangesSummary(previousContent, document.content),
    });

    await auditLogRepository.record({
      userId,
      documentId,
      action: "version.create",
      metadata: { versionNumber: version.versionNumber, isAutomatic },
    });

    return toSummary(version);
  },

  async restore(
    userId: string,
    documentId: string,
    versionId: string,
  ): Promise<VersionSummary> {
    const role = await accessRepository.getRoleForDocument(userId, documentId);
    assertRole(role, "EDITOR");

    const version = await versionRepository.findById(versionId);
    if (!version || version.documentId !== documentId) throw new NotFoundError("Version");

    const document = await documentRepository.findById(documentId);
    if (!document) throw new NotFoundError("Document");

    const restored = await prisma.$transaction(async (tx) => {
      // Safety net: snapshot the current (about-to-be-overwritten) state so
      // it is never lost, even though the user asked to roll back.
      const preRestoreHash = await sha256Hex(document.content);
      const preRestoreVersionNumber = await tx.version
        .findFirst({
          where: { documentId },
          orderBy: { versionNumber: "desc" },
          select: { versionNumber: true },
        })
        .then((v) => (v?.versionNumber ?? 0) + 1);

      const preRestoreSnapshot = await tx.snapshot.create({
        data: {
          documentId,
          content: document.content,
          contentJson: document.contentJson ?? undefined,
          hash: preRestoreHash,
          sizeBytes: Buffer.byteLength(document.content, "utf8"),
        },
      });
      await tx.version.create({
        data: {
          documentId,
          createdById: userId,
          label: "Auto-saved before restore",
          isAutomatic: true,
          versionNumber: preRestoreVersionNumber,
          contentSnapshotId: preRestoreSnapshot.id,
        },
      });

      const newDocVersion = document.version + 1;
      const updated = await tx.document.updateMany({
        where: { id: documentId, version: document.version },
        data: {
          version: newDocVersion,
          content: version.snapshot.content,
          contentJson: version.snapshot.contentJson ?? undefined,
        },
      });
      if (updated.count === 0) {
        throw new ConflictError(
          "The document changed while restoring. Please try again.",
        );
      }

      await tx.operation.create({
        data: {
          operationId: crypto.randomUUID(),
          clientId: "server-restore",
          documentId,
          userId,
          type: "SET_CONTENT",
          payload: { kind: "set_content", content: version.snapshot.content },
          baseVersion: document.version,
          resultVersion: newDocVersion,
          sequenceNumber: newDocVersion,
          clientTimestamp: new Date(),
          hash: preRestoreHash,
          status: "APPLIED",
        },
      });

      const restoredSnapshot = await tx.snapshot.create({
        data: {
          documentId,
          content: version.snapshot.content,
          contentJson: version.snapshot.contentJson ?? undefined,
          hash: version.snapshot.hash,
          sizeBytes: version.snapshot.sizeBytes,
        },
      });
      const restoredVersionNumber = preRestoreVersionNumber + 1;
      return tx.version.create({
        data: {
          documentId,
          createdById: userId,
          label: `Restored from version ${version.versionNumber}`,
          isAutomatic: false,
          versionNumber: restoredVersionNumber,
          contentSnapshotId: restoredSnapshot.id,
        },
        include: { createdBy: { select: { name: true } } },
      });
    });

    await auditLogRepository.record({
      userId,
      documentId,
      action: "version.restore",
      metadata: { restoredFromVersionNumber: version.versionNumber },
    });

    return toSummary(restored);
  },
};
