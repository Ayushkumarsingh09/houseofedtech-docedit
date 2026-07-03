async function request<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errBody = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new Error(errBody?.error?.message ?? "AI request failed");
  }
  return (await response.json()) as T;
}

export const aiApi = {
  summarize: (documentId: string, content: string) =>
    request<{ text: string; usedProvider: boolean }>("/api/ai/summarize", {
      documentId,
      content,
    }),

  complete: (documentId: string, content: string, mode: "continue" | "improve") =>
    request<{ text: string; usedProvider: boolean }>("/api/ai/complete", {
      documentId,
      content,
      mode,
    }),
};
