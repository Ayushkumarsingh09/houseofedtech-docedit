import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const settingsRepository = {
  findByUserId(userId: string) {
    return prisma.settings.findUnique({ where: { userId } });
  },

  update(userId: string, data: Prisma.SettingsUpdateInput) {
    return prisma.settings.update({ where: { userId }, data });
  },
};
