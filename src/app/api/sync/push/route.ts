import type { NextRequest } from "next/server";

import { RATE_LIMITS, SYNC_LIMITS } from "@/constants";
import { ok } from "@/lib/api-response";
import { withAuthedRoute } from "@/middlewares/compose";
import { enforceRateLimit } from "@/middlewares/with-rate-limit";
import { syncPushSchema } from "@/schemas/sync.schema";
import { pushOperations } from "@/services/sync.service";
import { parseWithSchema, readJsonBody } from "@/validators/validate-request";

export const POST = withAuthedRoute(async (request: NextRequest, { user }) => {
  enforceRateLimit(request, "sync", RATE_LIMITS.SYNC, user.id);

  const body = await readJsonBody(request, SYNC_LIMITS.MAX_REQUEST_BODY_BYTES);
  const input = parseWithSchema(syncPushSchema, body);

  const result = await pushOperations(user.id, input.documentId, input.operations);
  return ok(result);
});
