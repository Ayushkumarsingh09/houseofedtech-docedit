import { beforeEach, describe, expect, it } from "vitest";

import { RateLimitError } from "@/lib/errors";
import { checkRateLimit, resetRateLimiterForTests } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => resetRateLimiterForTests());

  it("allows requests under the limit", () => {
    for (let i = 0; i < 5; i++) {
      expect(() =>
        checkRateLimit({ key: "test:a", windowMs: 1000, max: 5 }),
      ).not.toThrow();
    }
  });

  it("throws RateLimitError once the limit is exceeded within the window", () => {
    for (let i = 0; i < 3; i++) {
      checkRateLimit({ key: "test:b", windowMs: 1000, max: 3 });
    }
    expect(() => checkRateLimit({ key: "test:b", windowMs: 1000, max: 3 })).toThrow(
      RateLimitError,
    );
  });

  it("tracks separate keys independently", () => {
    for (let i = 0; i < 3; i++)
      checkRateLimit({ key: "test:c1", windowMs: 1000, max: 3 });
    expect(() =>
      checkRateLimit({ key: "test:c2", windowMs: 1000, max: 3 }),
    ).not.toThrow();
  });

  it("resets the window after it elapses", async () => {
    for (let i = 0; i < 2; i++) checkRateLimit({ key: "test:d", windowMs: 20, max: 2 });
    expect(() => checkRateLimit({ key: "test:d", windowMs: 20, max: 2 })).toThrow(
      RateLimitError,
    );

    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(() => checkRateLimit({ key: "test:d", windowMs: 20, max: 2 })).not.toThrow();
  });
});
