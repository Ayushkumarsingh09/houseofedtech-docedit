import { prisma } from "@/lib/prisma";

export const userRepository = {
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  async create(data: {
    name: string;
    email: string;
    passwordHash: string;
    avatarColor: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data });
      await tx.settings.create({ data: { userId: user.id } });
      return user;
    });
  },

  findByIds(ids: string[]) {
    return prisma.user.findMany({ where: { id: { in: ids } } });
  },
};
