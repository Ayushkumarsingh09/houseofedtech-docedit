import { z } from "zod";

export const updateSettingsSchema = z.object({
  theme: z.enum(["LIGHT", "DARK", "SYSTEM"]).optional(),
  editorFontSize: z.number().int().min(12).max(24).optional(),
  autoSaveIntervalMs: z.number().int().min(200).max(5000).optional(),
  emailNotifications: z.boolean().optional(),
});
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
