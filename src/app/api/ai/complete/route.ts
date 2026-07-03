import { z } from "zod";

import { RATE_LIMITS, SYNC_LIMITS } from "@/constants";
import { ok } from "@/lib/api-response";
import { ForbiddenError } from "@/lib/errors";
import { withAuthedRoute } from "@/middlewares/compose";
import { enforceRateLimit } from "@/middlewares/with-rate-limit";
import { accessRepository } from "@/repositories/access.repository";
import { aiService } from "@/services/ai.service";
import { parseWithSchema, readJsonBody } from "@/validators/validate-request";

const bodySchema = z.object({
  documentId: z.string().min(1),
  content: z.string().max(SYNC_LIMITS.MAX_DOCUMENT_LENGTH),
  mode: z.enum(["continue", "improve"]).default("continue"),
});

export const POST = withAuthedRoute(async (request, { user }) => {
  enforceRateLimit(request, "ai", RATE_LIMITS.AI, user.id);

  const body = await readJsonBody(request);
  const input = parseWithSchema(bodySchema, body);

  const role = await accessRepository.getRoleForDocument(user.id, input.documentId);
  if (!role) throw new ForbiddenError();

  const result =
    input.mode === "continue"
      ? await aiService.continueWriting(input.content)
      : await aiService.improveWriting(input.content);

  return ok(result);
});
