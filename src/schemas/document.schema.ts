import { z } from "zod";

import { ROLES } from "@/constants";

export const createDocumentSchema = z.object({
  title: z.string().trim().min(1).max(300).default("Untitled document"),
});
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;

export const updateDocumentSchema = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  isArchived: z.boolean().optional(),
});
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;

export const addCollaboratorSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(["EDITOR", "VIEWER"]),
});
export type AddCollaboratorInput = z.infer<typeof addCollaboratorSchema>;

export const updateCollaboratorSchema = z.object({
  role: z.enum(ROLES),
});
export type UpdateCollaboratorInput = z.infer<typeof updateCollaboratorSchema>;

export const createVersionSchema = z.object({
  label: z.string().trim().min(1).max(120).optional(),
});
export type CreateVersionInput = z.infer<typeof createVersionSchema>;

export const documentIdParamSchema = z.object({
  id: z.string().min(1),
});
