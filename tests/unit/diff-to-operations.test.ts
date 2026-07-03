import { describe, expect, it } from "vitest";

import { applyPayload } from "@/lib/sync-engine/conflict-resolver";
import { diffToOperations } from "@/lib/sync-engine/diff-to-operations";

function applyAll(
  content: string,
  payloads: ReturnType<typeof diffToOperations>,
): string {
  let state = { content, title: "" };
  for (const payload of payloads) {
    state = applyPayload(state, payload);
  }
  return state.content;
}

describe("diffToOperations", () => {
  it("returns an empty array when content is unchanged", () => {
    expect(diffToOperations("hello", "hello")).toEqual([]);
  });

  it("produces a single insert for pure additions", () => {
    const ops = diffToOperations("hello", "hello world");
    expect(ops).toEqual([{ kind: "insert", position: 5, text: " world" }]);
  });

  it("produces a single delete for pure removals", () => {
    const ops = diffToOperations("hello world", "hello");
    expect(ops).toEqual([
      { kind: "delete", position: 5, length: 6, deletedText: " world" },
    ]);
  });

  it("produces at least one replace for adjacent removal + addition", () => {
    const ops = diffToOperations("hello world", "hello there");
    expect(ops.some((op) => op.kind === "replace")).toBe(true);
    expect(applyAll("hello world", ops)).toBe("hello there");
  });

  it("round-trips: applying the generated operations reproduces the target content", () => {
    const cases: Array<[string, string]> = [
      ["", "Hello, Nimbus!"],
      ["Hello, Nimbus!", ""],
      ["The quick brown fox", "The slow brown fox jumps"],
      ["abcdefghij", "abXYZfghij"],
      [
        "Paragraph one.\nParagraph two.",
        "Paragraph one.\nParagraph TWO.\nParagraph three.",
      ],
    ];

    for (const [before, after] of cases) {
      const ops = diffToOperations(before, after);
      expect(applyAll(before, ops)).toBe(after);
    }
  });
});
