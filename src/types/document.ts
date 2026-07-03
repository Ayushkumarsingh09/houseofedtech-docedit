import type { RoleName } from "@/constants";

export interface DocumentSummary {
  id: string;
  title: string;
  ownerId: string;
  ownerName: string;
  role: RoleName;
  version: number;
  updatedAt: string;
  createdAt: string;
  isArchived: boolean;
  excerpt: string;
  collaboratorCount: number;
}

export interface DocumentDetail extends DocumentSummary {
  content: string;
  contentJson: unknown;
}

export interface CollaboratorSummary {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarColor: string;
  role: RoleName;
  invitedAt: string;
}

export interface VersionSummary {
  id: string;
  versionNumber: number;
  label: string | null;
  isAutomatic: boolean;
  createdAt: string;
  createdByName: string;
  changesSummary: { insertions: number; deletions: number; charCount: number } | null;
}

export interface VersionDetail extends VersionSummary {
  content: string;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
