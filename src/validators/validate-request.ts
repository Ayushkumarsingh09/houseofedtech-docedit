import type { ZodType } from "zod";

import { PayloadTooLargeError, ValidationError } from "@/lib/errors";
import { SYNC_LIMITS } from "@/constants";

/**
 * Parses and validates a JSON request body against a Zod schema, throwing a
 * typed `ValidationError` (→ 400) on failure instead of letting a raw
 * ZodError leak out of the route handler.
 */
export function parseWithSchema<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationError("The request payload failed validation.", {
      issues: result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }
  return result.data;
}

/**
 * Rejects oversized request bodies *before* JSON parsing is attempted,
 * mitigating a key attack vector called out in the assignment: a malicious
 * actor sending a massive payload to exhaust server memory.
 */
export function assertBodySize(
  request: Request,
  maxBytes = SYNC_LIMITS.MAX_REQUEST_BODY_BYTES,
) {
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > maxBytes) {
    throw new PayloadTooLargeError(
      `Request body of ${contentLength} bytes exceeds the ${maxBytes} byte limit.`,
    );
  }
}

export async function readJsonBody(
  request: Request,
  maxBytes?: number,
): Promise<unknown> {
  assertBodySize(request, maxBytes);

  const text = await request.text();
  if (
    new TextEncoder().encode(text).length >
    (maxBytes ?? SYNC_LIMITS.MAX_REQUEST_BODY_BYTES)
  ) {
    throw new PayloadTooLargeError();
  }
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    throw new ValidationError("Request body must be valid JSON.");
  }
}
