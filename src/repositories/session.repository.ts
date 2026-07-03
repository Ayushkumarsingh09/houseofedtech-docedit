import { prisma } from "@/lib/prisma";

export const sessionRepository = {
  create(data: {
    userId: string;
    refreshTokenHash: string;
    userAgent?: string | null;
    ipAddress?: string | null;
    expiresAt: Date;
  }) {
    return prisma.session.create({ data });
  },

  findByRefreshTokenHash(refreshTokenHash: string) {
    return prisma.session.findUnique({ where: { refreshTokenHash } });
  },

  revoke(id: string) {
    return prisma.session.update({ where: { id }, data: { revokedAt: new Date() } });
  },

  revokeAllForUser(userId: string) {
    return prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  deleteExpired() {
    return prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  },
};
