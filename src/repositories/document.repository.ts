import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const documentRepository = {
  async listForUser(userId: string) {
    return prisma.document.findMany({
      where: {
        isDeleted: false,
        OR: [{ ownerId: userId }, { collaborators: { some: { userId } } }],
      },
      include: {
        owner: { select: { id: true, name: true } },
        collaborators: true,
      },
      orderBy: { updatedAt: "desc" },
    });
  },

  findById(id: string) {
    return prisma.document.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true } },
        collaborators: { select: { userId: true, role: true } },
      },
    });
  },

  create(data: { title: string; ownerId: string; content?: string }) {
    return prisma.document.create({
      data: { title: data.title, ownerId: data.ownerId, content: data.content ?? "" },
    });
  },

  update(id: string, data: Prisma.DocumentUpdateInput) {
    return prisma.document.update({ where: { id }, data });
  },

  softDelete(id: string) {
    return prisma.document.update({ where: { id }, data: { isDeleted: true } });
  },

  /**
   * Optimistic-locking write: only succeeds if the row is still at
   * `expectedVersion`. Returns the number of rows affected (0 means someone
   * else advanced the version first — the caller must re-read and retry).
   */
  async applyOperationsAtomically(params: {
    documentId: string;
    expectedVersion: number;
    newVersion: number;
    content: string;
    contentJson: Prisma.InputJsonValue | undefined;
    title?: string;
  }) {
    const result = await prisma.document.updateMany({
      where: { id: params.documentId, version: params.expectedVersion },
      data: {
        version: params.newVersion,
        content: params.content,
        ...(params.contentJson !== undefined ? { contentJson: params.contentJson } : {}),
        ...(params.title !== undefined ? { title: params.title } : {}),
      },
    });
    return result.count;
  },
};
