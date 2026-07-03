import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@prisma/client";

export const notificationRepository = {
  create(data: {
    userId: string;
    type: NotificationType;
    title: string;
    body?: string;
    documentId?: string;
  }) {
    return prisma.notification.create({ data });
  },

  listForUser(userId: string, limit = 50) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  },

  markRead(id: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  },
};
