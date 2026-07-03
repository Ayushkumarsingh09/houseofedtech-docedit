import type { NextRequest } from "next/server";

import { RATE_LIMITS } from "@/constants";
import { ok } from "@/lib/api-response";
import { setAuthCookies } from "@/lib/auth-cookies";
import { extractClientIp } from "@/lib/rate-limit";
import { withErrorHandling } from "@/middlewares/with-error-handling";
import { enforceRateLimit } from "@/middlewares/with-rate-limit";
import { loginSchema } from "@/schemas/auth.schema";
import { authService } from "@/services/auth.service";
import { parseWithSchema, readJsonBody } from "@/validators/validate-request";

export const POST = withErrorHandling(async (request: NextRequest) => {
  enforceRateLimit(request, "auth", RATE_LIMITS.AUTH);

  const body = await readJsonBody(request);
  const input = parseWithSchema(loginSchema, body);

  const { user, tokens } = await authService.login(input, {
    ipAddress: extractClientIp(request.headers),
    userAgent: request.headers.get("user-agent"),
  });

  const response = ok({ user });
  setAuthCookies(response, tokens);
  return response;
});
