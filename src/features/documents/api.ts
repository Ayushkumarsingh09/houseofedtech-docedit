import type { CreateDocumentInput, UpdateDocumentInput } from "@/schemas/document.schema";
import type {
  CollaboratorSummary,
  DocumentDetail,
  DocumentSummary,
} from "@/types/document";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new Error(body?.error?.message ?? "Something went wrong. Please try again.");
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const documentsApi = {
  list: () => request<{ documents: DocumentSummary[] }>("/api/documents"),

  get: (id: string) => request<{ document: DocumentDetail }>(`/api/documents/${id}`),

  create: (input: CreateDocumentInput) =>
    request<{ document: DocumentDetail }>("/api/documents", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  update: (id: string, input: UpdateDocumentInput) =>
    request<{ document: DocumentDetail }>(`/api/documents/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),

  remove: (id: string) => request<void>(`/api/documents/${id}`, { method: "DELETE" }),

  listCollaborators: (id: string) =>
    request<{ collaborators: CollaboratorSummary[] }>(
      `/api/documents/${id}/collaborators`,
    ),

  addCollaborator: (id: string, input: { email: string; role: "EDITOR" | "VIEWER" }) =>
    request<{ collaborator: CollaboratorSummary }>(`/api/documents/${id}/collaborators`, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  updateCollaborator: (id: string, userId: string, role: string) =>
    request<{ collaborator: CollaboratorSummary }>(
      `/api/documents/${id}/collaborators/${userId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ role }),
      },
    ),

  removeCollaborator: (id: string, userId: string) =>
    request<void>(`/api/documents/${id}/collaborators/${userId}`, { method: "DELETE" }),
};
