import { prisma } from "@/lib/prisma";
import type { RoleName } from "@/constants";

/**
 * Single source of truth for "can this user touch this document, and with
 * what role?" — every repository/service that mutates a document routes
 * through here first. This is the strict ORM-scoping equivalent of Postgres
 * Row Level Security: no query anywhere else is allowed to fetch a document
 * by ID alone without checking the caller's membership.
 */
export const accessRepository = {
  async getRoleForDocument(userId: string, documentId: string): Promise<RoleName | null> {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { ownerId: true },
    });
    if (!document) return null;
    if (document.ownerId === userId) return "OWNER";

    const collaborator = await prisma.collaborator.findUnique({
      where: { documentId_userId: { documentId, userId } },
      select: { role: true },
    });
    return collaborator?.role ?? null;
  },

  /** Document IDs the user may see, via ownership or collaboration. */
  async accessibleDocumentIds(userId: string): Promise<string[]> {
    const [owned, shared] = await Promise.all([
      prisma.document.findMany({ where: { ownerId: userId }, select: { id: true } }),
      prisma.collaborator.findMany({ where: { userId }, select: { documentId: true } }),
    ]);
    return [...new Set([...owned.map((d) => d.id), ...shared.map((c) => c.documentId)])];
  },
};
