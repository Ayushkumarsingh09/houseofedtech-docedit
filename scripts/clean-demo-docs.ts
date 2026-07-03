import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({ where: { email: "demo@nimbusdocs.dev" } });
  if (!user) {
    console.log("no demo user");
    return;
  }
  const docs = await prisma.document.findMany({ where: { ownerId: user.id } });
  for (const d of docs) {
    await prisma.operation.deleteMany({ where: { documentId: d.id } });
    await prisma.version.deleteMany({ where: { documentId: d.id } });
    await prisma.snapshot.deleteMany({ where: { documentId: d.id } });
    await prisma.collaborator.deleteMany({ where: { documentId: d.id } });
    await prisma.auditLog.deleteMany({ where: { documentId: d.id } });
  }
  await prisma.document.deleteMany({ where: { ownerId: user.id } });
  console.log("cleared", docs.length, "documents");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
