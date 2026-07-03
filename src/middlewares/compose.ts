import { withAuth } from "@/middlewares/with-auth";
import { withErrorHandling } from "@/middlewares/with-error-handling";

/** Standard stack for authenticated API routes: error boundary + auth. */
export function withAuthedRoute<P = Record<string, never>>(
  handler: Parameters<typeof withAuth<P>>[0],
) {
  return withErrorHandling<P>(withAuth<P>(handler));
}

export { withErrorHandling } from "@/middlewares/with-error-handling";
