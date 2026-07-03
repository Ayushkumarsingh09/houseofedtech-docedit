import type { NextRequest } from "next/server";

import { toErrorResponse } from "@/lib/api-response";

type RouteContext<P> = { params: Promise<P> };
type Handler<P> = (request: NextRequest, ctx: RouteContext<P>) => Promise<Response>;

/**
 * Outermost boundary for every route handler: guarantees a well-formed
 * `{ error }` JSON response (never an unhandled 500 HTML page) no matter
 * what throws further down the stack.
 */
export function withErrorHandling<P = Record<string, never>>(handler: Handler<P>) {
  return async (request: NextRequest, ctx: RouteContext<P>) => {
    try {
      return await handler(request, ctx);
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}
