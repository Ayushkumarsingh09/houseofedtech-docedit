import { ROLE_RANK, type RoleName } from "@/constants";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { sanitizeHtml, stripHtml } from "@/lib/sanitize";
import { accessRepository } from "@/repositories/access.repository";
import { auditLogRepository } from "@/repositories/audit-log.repository";
import { documentRepository } from "@/repositories/document.repository";
import type { CreateDocumentInput, UpdateDocumentInput } from "@/schemas/document.schema";
import type { DocumentDetail, DocumentSummary } from "@/types/document";

export function assertRole(
  role: RoleName | null,
  minimum: RoleName,
): asserts role is RoleName {
  if (!role || ROLE_RANK[role] < ROLE_RANK[minimum]) {
    throw new ForbiddenError(
      role
        ? `This action requires the "${minimum}" role or higher.`
        : "You do not have access to this document.",
    );
  }
}

interface DocumentWithRelations {
  id: string;
  title: string;
  ownerId: string;
  owner: { name: string };
  version: number;
  updatedAt: Date;
  createdAt: Date;
  isArchived: boolean;
  content: string;
  collaborators: Array<{ userId: string; role: RoleName }>;
}

function toSummary(doc: DocumentWithRelations, role: RoleName): DocumentSummary {
  return {
    id: doc.id,
    title: doc.title,
    ownerId: doc.ownerId,
    ownerName: doc.owner.name,
    role,
    version: doc.version,
    updatedAt: doc.updatedAt.toISOString(),
    createdAt: doc.createdAt.toISOString(),
    isArchived: doc.isArchived,
    excerpt: stripHtml(doc.content).slice(0, 180),
    collaboratorCount: doc.collaborators.length,
  };
}

export const documentService = {
  async list(userId: string): Promise<DocumentSummary[]> {
    const docs = await documentRepository.listForUser(userId);
    return docs.map((doc) => {
      const role: RoleName =
        doc.ownerId === userId
          ? "OWNER"
          : (doc.collaborators.find((c) => c.userId === userId)?.role ?? "VIEWER");
      return toSummary(doc, role);
    });
  },

  async create(userId: string, input: CreateDocumentInput): Promise<DocumentDetail> {
    const doc = await documentRepository.create({ title: input.title, ownerId: userId });
    await auditLogRepository.record({
      userId,
      documentId: doc.id,
      action: "document.create",
    });
    const full = await documentRepository.findById(doc.id);
    if (!full) throw new NotFoundError("Document");
    return {
      ...toSummary(full, "OWNER"),
      content: full.content,
      contentJson: full.contentJson,
    };
  },

  async get(userId: string, documentId: string): Promise<DocumentDetail> {
    const role = await accessRepository.getRoleForDocument(userId, documentId);
    if (!role) throw new NotFoundError("Document");

    const doc = await documentRepository.findById(documentId);
    if (!doc || doc.isDeleted) throw new NotFoundError("Document");

    return {
      ...toSummary(doc, role),
      content: doc.content,
      contentJson: doc.contentJson,
    };
  },

  async update(
    userId: string,
    documentId: string,
    input: UpdateDocumentInput,
  ): Promise<DocumentDetail> {
    const role = await accessRepository.getRoleForDocument(userId, documentId);
    assertRole(role, "EDITOR");

    const data: { title?: string; isArchived?: boolean } = {};
    if (input.title !== undefined) data.title = sanitizeHtml(input.title);
    if (input.isArchived !== undefined) {
      assertRole(role, "OWNER");
      data.isArchived = input.isArchived;
    }

    await documentRepository.update(documentId, data);
    await auditLogRepository.record({
      userId,
      documentId,
      action: "document.update",
      metadata: data,
    });
    return documentService.get(userId, documentId);
  },

  async remove(userId: string, documentId: string): Promise<void> {
    const role = await accessRepository.getRoleForDocument(userId, documentId);
    assertRole(role, "OWNER");
    await documentRepository.softDelete(documentId);
    await auditLogRepository.record({ userId, documentId, action: "document.delete" });
  },
};
