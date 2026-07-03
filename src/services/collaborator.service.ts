import { assertRole } from "@/services/document.service";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { accessRepository } from "@/repositories/access.repository";
import { auditLogRepository } from "@/repositories/audit-log.repository";
import { collaboratorRepository } from "@/repositories/collaborator.repository";
import { notificationRepository } from "@/repositories/notification.repository";
import { userRepository } from "@/repositories/user.repository";
import type {
  AddCollaboratorInput,
  UpdateCollaboratorInput,
} from "@/schemas/document.schema";
import type { CollaboratorSummary } from "@/types/document";

function toSummary(c: {
  id: string;
  userId: string;
  role: string;
  invitedAt: Date;
  user: { name: string; email: string; avatarColor: string };
}): CollaboratorSummary {
  return {
    id: c.id,
    userId: c.userId,
    name: c.user.name,
    email: c.user.email,
    avatarColor: c.user.avatarColor,
    role: c.role as CollaboratorSummary["role"],
    invitedAt: c.invitedAt.toISOString(),
  };
}

export const collaboratorService = {
  async list(userId: string, documentId: string): Promise<CollaboratorSummary[]> {
    const role = await accessRepository.getRoleForDocument(userId, documentId);
    assertRole(role, "VIEWER");
    const collaborators = await collaboratorRepository.listForDocument(documentId);
    return collaborators.map(toSummary);
  },

  async add(
    userId: string,
    documentId: string,
    input: AddCollaboratorInput,
  ): Promise<CollaboratorSummary> {
    const role = await accessRepository.getRoleForDocument(userId, documentId);
    assertRole(role, "OWNER");

    const invitee = await userRepository.findByEmail(input.email);
    if (!invitee) throw new NotFoundError("A user with that email");

    const inviterRole = await accessRepository.getRoleForDocument(invitee.id, documentId);
    if (inviterRole === "OWNER") {
      throw new ConflictError("This user already owns the document.");
    }

    const collaborator = await collaboratorRepository.upsert(
      documentId,
      invitee.id,
      input.role,
    );
    await notificationRepository.create({
      userId: invitee.id,
      type: "COLLABORATOR_ADDED",
      title: "You were added to a document",
      documentId,
    });
    await auditLogRepository.record({
      userId,
      documentId,
      action: "collaborator.add",
      metadata: { invitedUserId: invitee.id, role: input.role },
    });

    return toSummary({ ...collaborator, user: invitee });
  },

  async update(
    userId: string,
    documentId: string,
    collaboratorUserId: string,
    input: UpdateCollaboratorInput,
  ): Promise<CollaboratorSummary> {
    const role = await accessRepository.getRoleForDocument(userId, documentId);
    assertRole(role, "OWNER");
    if (input.role === "OWNER") {
      throw new ValidationError("Ownership cannot be transferred via this endpoint.");
    }

    const collaborator = await collaboratorRepository.upsert(
      documentId,
      collaboratorUserId,
      input.role,
    );
    const user = await userRepository.findById(collaboratorUserId);
    if (!user) throw new NotFoundError("Collaborator");

    await auditLogRepository.record({
      userId,
      documentId,
      action: "collaborator.update",
      metadata: { collaboratorUserId, role: input.role },
    });

    return toSummary({ ...collaborator, user });
  },

  async remove(
    userId: string,
    documentId: string,
    collaboratorUserId: string,
  ): Promise<void> {
    const role = await accessRepository.getRoleForDocument(userId, documentId);
    assertRole(role, "OWNER");
    await collaboratorRepository.remove(documentId, collaboratorUserId);
    await auditLogRepository.record({
      userId,
      documentId,
      action: "collaborator.remove",
      metadata: { collaboratorUserId },
    });
  },
};
