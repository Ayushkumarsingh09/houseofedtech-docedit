import { describe, expect, it } from "vitest";
import { z } from "zod";

import { PayloadTooLargeError, ValidationError } from "@/lib/errors";
import {
  assertBodySize,
  parseWithSchema,
  readJsonBody,
} from "@/validators/validate-request";

describe("parseWithSchema", () => {
  const schema = z.object({ name: z.string().min(1) });

  it("returns the parsed data on success", () => {
    expect(parseWithSchema(schema, { name: "Nimbus" })).toEqual({ name: "Nimbus" });
  });

  it("throws ValidationError with issue details on failure", () => {
    try {
      parseWithSchema(schema, { name: "" });
      expect.fail("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).details).toBeDefined();
    }
  });
});

function requestWithContentLength(length: string): Request {
  // `content-length` is a forbidden header for the Fetch `Request` constructor,
  // so we build a minimal stand-in exposing only what `assertBodySize` reads.
  return {
    headers: { get: (name: string) => (name === "content-length" ? length : null) },
  } as unknown as Request;
}

describe("assertBodySize", () => {
  it("throws PayloadTooLargeError when Content-Length exceeds the limit", () => {
    const request = requestWithContentLength(String(10 * 1024 * 1024));
    expect(() => assertBodySize(request, 1024)).toThrow(PayloadTooLargeError);
  });

  it("passes when within the limit", () => {
    const request = requestWithContentLength("10");
    expect(() => assertBodySize(request, 1024)).not.toThrow();
  });
});

describe("readJsonBody", () => {
  it("parses a valid JSON body", async () => {
    const request = new Request("http://localhost/api/test", {
      method: "POST",
      body: JSON.stringify({ ok: true }),
    });
    expect(await readJsonBody(request)).toEqual({ ok: true });
  });

  it("throws ValidationError for malformed JSON", async () => {
    const request = new Request("http://localhost/api/test", {
      method: "POST",
      body: "{not json",
    });
    await expect(readJsonBody(request)).rejects.toThrow(ValidationError);
  });

  it("returns an empty object for an empty body", async () => {
    const request = new Request("http://localhost/api/test", {
      method: "POST",
      body: "",
    });
    expect(await readJsonBody(request)).toEqual({});
  });
});
