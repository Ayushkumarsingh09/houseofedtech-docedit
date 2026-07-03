import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

export const collaboratorRepository = {
  listForDocument(documentId: string) {
    return prisma.collaborator.findMany({
      where: { documentId },
      include: {
        user: { select: { id: true, name: true, email: true, avatarColor: true } },
      },
      orderBy: { invitedAt: "asc" },
    });
  },

  upsert(documentId: string, userId: string, role: Role) {
    return prisma.collaborator.upsert({
      where: { documentId_userId: { documentId, userId } },
      create: { documentId, userId, role },
      update: { role },
    });
  },

  remove(documentId: string, userId: string) {
    return prisma.collaborator.delete({
      where: { documentId_userId: { documentId, userId } },
    });
  },
};
