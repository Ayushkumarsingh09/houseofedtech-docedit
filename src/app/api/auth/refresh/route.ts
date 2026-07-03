import type { NextRequest } from "next/server";

import { COOKIE_NAMES } from "@/constants";
import { ok } from "@/lib/api-response";
import { setAuthCookies } from "@/lib/auth-cookies";
import { extractClientIp } from "@/lib/rate-limit";
import { UnauthorizedError } from "@/lib/errors";
import { withErrorHandling } from "@/middlewares/with-error-handling";
import { authService } from "@/services/auth.service";

export const POST = withErrorHandling(async (request: NextRequest) => {
  const refreshToken = request.cookies.get(COOKIE_NAMES.REFRESH_TOKEN)?.value;
  if (!refreshToken) throw new UnauthorizedError("No active session found.");

  const { user, tokens } = await authService.refresh(refreshToken, {
    ipAddress: extractClientIp(request.headers),
    userAgent: request.headers.get("user-agent"),
  });

  const response = ok({ user });
  setAuthCookies(response, tokens);
  return response;
});
