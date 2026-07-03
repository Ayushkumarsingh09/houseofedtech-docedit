import type { VersionDetail, VersionSummary } from "@/types/document";

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
    throw new Error(body?.error?.message ?? "Something went wrong.");
  }
  return (await response.json()) as T;
}

export const versionsApi = {
  list: (documentId: string) =>
    request<{ versions: VersionSummary[] }>(`/api/documents/${documentId}/versions`),

  get: (documentId: string, versionId: string) =>
    request<{ version: VersionDetail }>(
      `/api/documents/${documentId}/versions/${versionId}`,
    ),

  create: (documentId: string, label?: string) =>
    request<{ version: VersionSummary }>(`/api/documents/${documentId}/versions`, {
      method: "POST",
      body: JSON.stringify({ label }),
    }),

  restore: (documentId: string, versionId: string) =>
    request<{ version: VersionSummary }>(
      `/api/documents/${documentId}/versions/${versionId}/restore`,
      {
        method: "POST",
      },
    ),
};
