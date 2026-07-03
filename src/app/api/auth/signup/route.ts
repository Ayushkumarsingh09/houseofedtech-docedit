import type { NextRequest } from "next/server";

import { created } from "@/lib/api-response";
import { setAuthCookies } from "@/lib/auth-cookies";
import { RATE_LIMITS } from "@/constants";
import { withErrorHandling } from "@/middlewares/with-error-handling";
import { enforceRateLimit } from "@/middlewares/with-rate-limit";
import { signupSchema } from "@/schemas/auth.schema";
import { authService } from "@/services/auth.service";
import { extractClientIp } from "@/lib/rate-limit";
import { parseWithSchema, readJsonBody } from "@/validators/validate-request";

export const POST = withErrorHandling(async (request: NextRequest) => {
  enforceRateLimit(request, "auth", RATE_LIMITS.AUTH);

  const body = await readJsonBody(request);
  const input = parseWithSchema(signupSchema, body);

  const { user, tokens } = await authService.signup(input, {
    ipAddress: extractClientIp(request.headers),
    userAgent: request.headers.get("user-agent"),
  });

  const response = created({ user });
  setAuthCookies(response, tokens);
  return response;
});
