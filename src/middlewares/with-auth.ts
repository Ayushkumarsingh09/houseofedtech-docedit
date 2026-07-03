import type { NextRequest } from "next/server";

import { COOKIE_NAMES } from "@/constants";
import { UnauthorizedError } from "@/lib/errors";
import { verifyAccessToken } from "@/lib/jwt";
import type { AuthUser } from "@/types/auth";

export async function getAuthUser(request: NextRequest): Promise<AuthUser> {
  const token = request.cookies.get(COOKIE_NAMES.ACCESS_TOKEN)?.value;
  if (!token) throw new UnauthorizedError();

  try {
    const claims = await verifyAccessToken(token);
    return { id: claims.sub, email: claims.email, name: claims.name, avatarColor: "" };
  } catch {
    throw new UnauthorizedError("Your session has expired. Please log in again.");
  }
}

type RouteContext<P> = { params: Promise<P> };
type AuthedHandler<P> = (
  request: NextRequest,
  ctx: { params: P; user: AuthUser },
) => Promise<Response>;

/**
 * Wraps a Next.js Route Handler so it only ever runs with a verified user
 * attached, and resolves the (async, Next.js 15+) dynamic route params once
 * up front.
 */
export function withAuth<P = Record<string, never>>(handler: AuthedHandler<P>) {
  return async (request: NextRequest, routeContext: RouteContext<P>) => {
    const user = await getAuthUser(request);
    const params = await routeContext.params;
    return handler(request, { params, user });
  };
}
