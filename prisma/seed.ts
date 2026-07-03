/**
 * Development seed data. Creates a demo account plus a handful of
 * documents, collaborators, and version history so a fresh clone has
 * something meaningful to explore immediately.
 *
 * Usage: `npm run db:seed`
 */
import { faker } from "@faker-js/faker";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "Password123";

async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

async function main() {
  console.log("Seeding database...");

  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const owner = await prisma.user.upsert({
    where: { email: "demo@nimbusdocs.dev" },
    update: {},
    create: {
      name: "Demo Owner",
      email: "demo@nimbusdocs.dev",
      passwordHash,
      avatarColor: "#6366F1",
      settings: { create: {} },
    },
  });

  const collaborator = await prisma.user.upsert({
    where: { email: "collaborator@nimbusdocs.dev" },
    update: {},
    create: {
      name: "Demo Collaborator",
      email: "collaborator@nimbusdocs.dev",
      passwordHash,
      avatarColor: "#10B981",
      settings: { create: {} },
    },
  });

  const documentSeeds = [
    {
      title: "Product Roadmap Q3",
      content:
        "<h1>Product Roadmap Q3</h1><p>Our focus areas for this quarter are performance, collaboration, and mobile support.</p><ul><li>Ship the offline sync engine</li><li>Launch version history</li><li>Improve editor performance</li></ul>",
    },
    {
      title: "Engineering Design Doc: Sync Engine",
      content:
        "<h1>Sync Engine Design</h1><p>This document describes the operational-transform based conflict resolution strategy used across the app.</p><p>Key properties: deterministic, idempotent, lossless.</p>",
    },
    {
      title: "Meeting Notes — Weekly Sync",
      content: `<h2>Weekly Sync</h2><p>${faker.lorem.paragraphs(2, "<br/><br/>")}</p>`,
    },
  ];

  for (const seed of documentSeeds) {
    const document = await prisma.document.create({
      data: {
        title: seed.title,
        content: seed.content,
        ownerId: owner.id,
        version: 1,
        collaborators: {
          create: { userId: collaborator.id, role: "EDITOR" },
        },
      },
    });

    const snapshot = await prisma.snapshot.create({
      data: {
        documentId: document.id,
        content: seed.content,
        hash: faker.string.alphanumeric(64),
        sizeBytes: Buffer.byteLength(seed.content, "utf8"),
      },
    });

    await prisma.version.create({
      data: {
        documentId: document.id,
        createdById: owner.id,
        versionNumber: 1,
        label: "Initial version",
        isAutomatic: false,
        contentSnapshotId: snapshot.id,
        changesSummary: {
          insertions: seed.content.length,
          deletions: 0,
          charCount: seed.content.length,
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: owner.id,
        documentId: document.id,
        action: "document.create",
        metadata: { seeded: true },
      },
    });
  }

  console.log("Seed complete.");
  console.log("Demo login: demo@nimbusdocs.dev / Password123");
  console.log("Collaborator login: collaborator@nimbusdocs.dev / Password123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
