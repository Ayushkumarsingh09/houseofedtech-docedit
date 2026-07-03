import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";

process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
process.env.AUTH_ACCESS_TOKEN_SECRET ??=
  "test-access-token-secret-please-ignore-1234567890";
process.env.AUTH_REFRESH_TOKEN_SECRET ??=
  "test-refresh-token-secret-please-ignore-1234567890";
