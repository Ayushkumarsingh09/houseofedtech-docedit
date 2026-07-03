import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const versionRepository = {
  listForDocument(documentId: string) {
    return prisma.version.findMany({
      where: { documentId },
      include: { createdBy: { select: { name: true } } },
      orderBy: { versionNumber: "desc" },
    });
  },

  findById(id: string) {
    return prisma.version.findUnique({
      where: { id },
      include: { snapshot: true, createdBy: { select: { name: true } } },
    });
  },

  async getLatestSnapshotContent(documentId: string): Promise<string> {
    const latest = await prisma.version.findFirst({
      where: { documentId },
      orderBy: { versionNumber: "desc" },
      include: { snapshot: { select: { content: true } } },
    });
    return latest?.snapshot.content ?? "";
  },

  async getNextVersionNumber(documentId: string): Promise<number> {
    const latest = await prisma.version.findFirst({
      where: { documentId },
      orderBy: { versionNumber: "desc" },
      select: { versionNumber: true },
    });
    return (latest?.versionNumber ?? 0) + 1;
  },

  async createWithSnapshot(params: {
    documentId: string;
    createdById: string;
    label?: string;
    isAutomatic: boolean;
    content: string;
    contentJson: Prisma.InputJsonValue | undefined;
    hash: string;
    changesSummary: Prisma.InputJsonValue | undefined;
  }) {
    return prisma.$transaction(async (tx) => {
      const versionNumber =
        (
          (await tx.version.findFirst({
            where: { documentId: params.documentId },
            orderBy: { versionNumber: "desc" },
            select: { versionNumber: true },
          })) ?? { versionNumber: 0 }
        ).versionNumber + 1;

      const snapshot = await tx.snapshot.create({
        data: {
          documentId: params.documentId,
          content: params.content,
          contentJson: params.contentJson,
          hash: params.hash,
          sizeBytes: Buffer.byteLength(params.content, "utf8"),
        },
      });

      return tx.version.create({
        data: {
          documentId: params.documentId,
          createdById: params.createdById,
          label: params.label,
          isAutomatic: params.isAutomatic,
          versionNumber,
          contentSnapshotId: snapshot.id,
          changesSummary: params.changesSummary,
        },
        include: { snapshot: true, createdBy: { select: { name: true } } },
      });
    });
  },
};
