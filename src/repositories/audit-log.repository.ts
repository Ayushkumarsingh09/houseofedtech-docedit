import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export const auditLogRepository = {
  record(entry: {
    userId?: string | null;
    documentId?: string | null;
    action: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string | null;
  }) {
    return prisma.auditLog.create({
      data: {
        userId: entry.userId ?? null,
        documentId: entry.documentId ?? null,
        action: entry.action,
        metadata: entry.metadata as Prisma.InputJsonValue | undefined,
        ipAddress: entry.ipAddress ?? null,
      },
    });
  },

  listForDocument(documentId: string, limit = 100) {
    return prisma.auditLog.findMany({
      where: { documentId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  },
};
