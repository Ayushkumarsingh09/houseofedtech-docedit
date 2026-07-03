import { PrismaClient } from "@prisma/client";

import { getEnv } from "@/config/env";

/**
 * Prisma's recommended singleton pattern for Next.js dev mode, which
 * otherwise creates a new client (and a new connection pool) on every hot
 * reload until the database runs out of connections.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: getEnv().NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (getEnv().NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
