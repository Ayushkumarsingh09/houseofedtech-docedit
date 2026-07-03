import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const operationRepository = {
  findByOperationId(operationId: string) {
    return prisma.operation.findUnique({ where: { operationId } });
  },

  findManyByOperationIds(operationIds: string[]) {
    return prisma.operation.findMany({ where: { operationId: { in: operationIds } } });
  },

  create(data: Prisma.OperationUncheckedCreateInput) {
    return prisma.operation.create({ data });
  },

  listSince(documentId: string, sinceVersion: number, limit: number) {
    return prisma.operation.findMany({
      where: { documentId, resultVersion: { gt: sinceVersion } },
      orderBy: { resultVersion: "asc" },
      take: limit,
    });
  },

  countForDocument(documentId: string) {
    return prisma.operation.count({ where: { documentId } });
  },
};
