import type { NextRequest } from "next/server";

import { COOKIE_NAMES } from "@/constants";
import { noContent } from "@/lib/api-response";
import { clearAuthCookies } from "@/lib/auth-cookies";
import { withErrorHandling } from "@/middlewares/with-error-handling";
import { authService } from "@/services/auth.service";

export const POST = withErrorHandling(async (request: NextRequest) => {
  const refreshToken = request.cookies.get(COOKIE_NAMES.REFRESH_TOKEN)?.value;
  await authService.logout(refreshToken);

  const response = noContent();
  clearAuthCookies(response);
  return response;
});
