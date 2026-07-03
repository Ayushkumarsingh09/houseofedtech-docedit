import type { NextRequest } from "next/server";

import { ok } from "@/lib/api-response";
import { withAuthedRoute } from "@/middlewares/compose";
import { authService } from "@/services/auth.service";

export const GET = withAuthedRoute(async (_request: NextRequest, { user }) => {
  const fresh = await authService.me(user.id);
  return ok({ user: fresh });
});
