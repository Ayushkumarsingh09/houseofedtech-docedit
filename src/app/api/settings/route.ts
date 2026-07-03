import type { NextRequest } from "next/server";

import { ok } from "@/lib/api-response";
import { NotFoundError } from "@/lib/errors";
import { withAuthedRoute } from "@/middlewares/compose";
import { settingsRepository } from "@/repositories/settings.repository";
import { updateSettingsSchema } from "@/schemas/settings.schema";
import { parseWithSchema, readJsonBody } from "@/validators/validate-request";

export const GET = withAuthedRoute(async (_request, { user }) => {
  const settings = await settingsRepository.findByUserId(user.id);
  if (!settings) throw new NotFoundError("Settings");
  return ok({ settings });
});

export const PATCH = withAuthedRoute(async (request: NextRequest, { user }) => {
  const body = await readJsonBody(request);
  const input = parseWithSchema(updateSettingsSchema, body);
  const settings = await settingsRepository.update(user.id, input);
  return ok({ settings });
});
