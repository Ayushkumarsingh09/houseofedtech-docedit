import type { NextRequest } from "next/server";

import { RATE_LIMITS } from "@/constants";
import { ok } from "@/lib/api-response";
import { withAuthedRoute } from "@/middlewares/compose";
import { enforceRateLimit } from "@/middlewares/with-rate-limit";
import { syncPullSchema } from "@/schemas/sync.schema";
import { pullOperations } from "@/services/sync.service";
import { parseWithSchema } from "@/validators/validate-request";

export const GET = withAuthedRoute(async (request: NextRequest, { user }) => {
  enforceRateLimit(request, "sync", RATE_LIMITS.SYNC, user.id);

  const searchParams = request.nextUrl.searchParams;
  const input = parseWithSchema(syncPullSchema, {
    documentId: searchParams.get("documentId"),
    sinceVersion: Number(searchParams.get("sinceVersion") ?? "0"),
  });

  const result = await pullOperations(user.id, input.documentId, input.sinceVersion);
  return ok(result);
});
