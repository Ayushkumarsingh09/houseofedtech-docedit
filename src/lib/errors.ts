/**
 * Typed application error hierarchy. Every handler throws one of these and a
 * single boundary (`src/middlewares/with-error-handling.ts`) maps them to
 * HTTP responses — no ad-hoc `NextResponse.json({...}, { status })` scattered
 * around business logic.
 */
export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details?: unknown;

  constructor(code: string, message: string, statusCode: number, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(message = "The request payload is invalid.", details?: unknown) {
    super("VALIDATION_ERROR", message, 400, details);
    this.name = "ValidationError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication is required.") {
    super("UNAUTHORIZED", message, 401);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action.") {
    super("FORBIDDEN", message, 403);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super("NOT_FOUND", `${resource} was not found.`, 404);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(
    message = "The resource has changed since you last read it.",
    details?: unknown,
  ) {
    super("CONFLICT", message, 409, details);
    this.name = "ConflictError";
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfterMs: number) {
    super("RATE_LIMITED", "Too many requests. Please slow down.", 429, { retryAfterMs });
    this.name = "RateLimitError";
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(message = "The request payload exceeds the allowed size.") {
    super("PAYLOAD_TOO_LARGE", message, 413);
    this.name = "PayloadTooLargeError";
  }
}
