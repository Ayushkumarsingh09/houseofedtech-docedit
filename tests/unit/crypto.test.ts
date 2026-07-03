import { describe, expect, it } from "vitest";

import { canonicalJSONStringify, generateId, sha256Hex } from "@/lib/crypto";

describe("sha256Hex", () => {
  it("produces a stable, deterministic 64-character hex digest", async () => {
    const hash = await sha256Hex("hello world");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
    expect(await sha256Hex("hello world")).toBe(hash);
  });

  it("produces different digests for different input", async () => {
    expect(await sha256Hex("a")).not.toBe(await sha256Hex("b"));
  });
});

describe("canonicalJSONStringify", () => {
  it("produces identical output regardless of key order", () => {
    const a = canonicalJSONStringify({ b: 1, a: 2, c: { z: 1, y: 2 } });
    const b = canonicalJSONStringify({ a: 2, c: { y: 2, z: 1 }, b: 1 });
    expect(a).toBe(b);
  });

  it("preserves array order", () => {
    expect(canonicalJSONStringify([3, 1, 2])).toBe("[3,1,2]");
  });
});

describe("generateId", () => {
  it("generates unique ids", () => {
    const ids = new Set(Array.from({ length: 20 }, () => generateId()));
    expect(ids.size).toBe(20);
  });

  it("applies an optional prefix", () => {
    expect(generateId("op")).toMatch(/^op_/);
  });
});
