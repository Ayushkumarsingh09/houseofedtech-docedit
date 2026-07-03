import type { UpdateSettingsInput } from "@/schemas/settings.schema";

export interface SettingsDto {
  theme: "LIGHT" | "DARK" | "SYSTEM";
  editorFontSize: number;
  autoSaveIntervalMs: number;
  emailNotifications: boolean;
}

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

export const settingsApi = {
  get: () => request<{ settings: SettingsDto }>("/api/settings"),
  update: (input: UpdateSettingsInput) =>
    request<{ settings: SettingsDto }>("/api/settings", {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
};
