import type { SyncPullResponse, SyncPushRequest, SyncPushResponse } from "@/types/sync";

class SyncApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "SyncApiError";
  }
}

export { SyncApiError };

async function requestJson<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init.headers },
  });

  if (!response.ok) {
    const retryable =
      response.status >= 500 || response.status === 429 || response.status === 408;
    let message = `Request failed with status ${response.status}`;
    try {
      const body = (await response.json()) as { error?: { message?: string } };
      message = body.error?.message ?? message;
    } catch {
      // ignore body parse failure
    }
    throw new SyncApiError(message, response.status, retryable);
  }

  return (await response.json()) as T;
}

export function pushOperations(payload: SyncPushRequest): Promise<SyncPushResponse> {
  return requestJson<SyncPushResponse>("/api/sync/push", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function pullOperations(
  documentId: string,
  sinceVersion: number,
): Promise<SyncPullResponse> {
  const params = new URLSearchParams({ documentId, sinceVersion: String(sinceVersion) });
  return requestJson<SyncPullResponse>(`/api/sync/pull?${params.toString()}`, {
    method: "GET",
  });
}
