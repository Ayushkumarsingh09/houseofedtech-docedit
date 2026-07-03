import { describe, expect, it } from "vitest";

import { applyPayload, transformPayload } from "@/lib/sync-engine/conflict-resolver";
import type { OperationPayload } from "@/types/sync";

const CONTENT_LENGTH = 1000;

describe("conflict-resolver: transformPayload", () => {
  describe("insert vs insert", () => {
    it("shifts a later insert right when a concurrent insert lands before it", () => {
      const incoming: OperationPayload = { kind: "insert", position: 10, text: "world" };
      const against: OperationPayload = { kind: "insert", position: 2, text: "hello " };

      const result = transformPayload(incoming, against, CONTENT_LENGTH);

      expect(result.payload).toEqual({ kind: "insert", position: 16, text: "world" });
      expect(result.wasTransformed).toBe(true);
    });

    it("does not shift an insert that happens before the concurrent insert", () => {
      const incoming: OperationPayload = { kind: "insert", position: 2, text: "hello " };
      const against: OperationPayload = { kind: "insert", position: 10, text: "world" };

      const result = transformPayload(incoming, against, CONTENT_LENGTH);

      expect(result.payload).toEqual(incoming);
      expect(result.wasTransformed).toBe(false);
    });
  });

  describe("insert vs delete", () => {
    it("shifts an insert left when a concurrent delete removed text before it", () => {
      const incoming: OperationPayload = { kind: "insert", position: 20, text: "x" };
      const against: OperationPayload = { kind: "delete", position: 5, length: 5 };

      const result = transformPayload(incoming, against, CONTENT_LENGTH);

      expect(result.payload).toEqual({ kind: "insert", position: 15, text: "x" });
    });

    it("clamps an insert into the start of a deletion that swallowed its position", () => {
      const incoming: OperationPayload = { kind: "insert", position: 8, text: "x" };
      const against: OperationPayload = { kind: "delete", position: 5, length: 10 };

      const result = transformPayload(incoming, against, CONTENT_LENGTH);

      expect(result.payload).toEqual({ kind: "insert", position: 5, text: "x" });
    });
  });

  describe("delete vs insert", () => {
    it("shifts a delete range right when text was inserted before it", () => {
      const incoming: OperationPayload = { kind: "delete", position: 10, length: 4 };
      const against: OperationPayload = { kind: "insert", position: 2, text: "abcd" };

      const result = transformPayload(incoming, against, CONTENT_LENGTH);

      expect(result.payload).toEqual({ kind: "delete", position: 14, length: 4 });
    });

    it("preserves inserted text by truncating a delete range around it", () => {
      const incoming: OperationPayload = { kind: "delete", position: 5, length: 10 };
      const against: OperationPayload = { kind: "insert", position: 8, text: "NEW" };

      const result = transformPayload(incoming, against, CONTENT_LENGTH);

      // Only deletes [5, 8) — the portion before the concurrently inserted text.
      expect(result.payload).toEqual({ kind: "delete", position: 5, length: 3 });
      expect(result.wasTransformed).toBe(true);
    });
  });

  describe("delete vs delete", () => {
    it("is a no-op when the ranges don't overlap and the other delete is after", () => {
      const incoming: OperationPayload = { kind: "delete", position: 0, length: 5 };
      const against: OperationPayload = { kind: "delete", position: 20, length: 5 };

      const result = transformPayload(incoming, against, CONTENT_LENGTH);

      expect(result.payload).toEqual(incoming);
      expect(result.wasTransformed).toBe(false);
    });

    it("shifts left when a prior delete removed text entirely before it", () => {
      const incoming: OperationPayload = { kind: "delete", position: 20, length: 5 };
      const against: OperationPayload = { kind: "delete", position: 0, length: 10 };

      const result = transformPayload(incoming, against, CONTENT_LENGTH);

      expect(result.payload).toEqual({ kind: "delete", position: 10, length: 5 });
    });

    it("shrinks the overlapping portion instead of double-deleting", () => {
      const incoming: OperationPayload = { kind: "delete", position: 5, length: 10 }; // [5,15)
      const against: OperationPayload = { kind: "delete", position: 10, length: 10 }; // [10,20) already applied

      const result = transformPayload(incoming, against, CONTENT_LENGTH);

      // Overlap [10,15) = 5 chars already gone; keep deleting [5,10) = 5 chars.
      expect(result.payload).toEqual({ kind: "delete", position: 5, length: 5 });
    });

    it("becomes a no-op when fully contained within an already-applied delete", () => {
      const incoming: OperationPayload = { kind: "delete", position: 5, length: 5 }; // [5,10)
      const against: OperationPayload = { kind: "delete", position: 0, length: 20 }; // [0,20) already applied

      const result = transformPayload(incoming, against, CONTENT_LENGTH);

      expect(result.payload).toEqual({ kind: "delete", position: 0, length: 0 });
    });
  });

  describe("replace", () => {
    it("decomposes into delete+insert semantics when transformed against an insert", () => {
      const incoming: OperationPayload = {
        kind: "replace",
        position: 10,
        length: 4,
        text: "NEW",
      };
      const against: OperationPayload = { kind: "insert", position: 2, text: "abcd" };

      const result = transformPayload(incoming, against, CONTENT_LENGTH);

      expect(result.payload).toEqual({
        kind: "replace",
        position: 14,
        length: 4,
        text: "NEW",
      });
    });
  });

  describe("rename", () => {
    it("is unaffected by concurrent content operations", () => {
      const incoming: OperationPayload = { kind: "rename", title: "New title" };
      const against: OperationPayload = { kind: "insert", position: 0, text: "hello" };

      const result = transformPayload(incoming, against, CONTENT_LENGTH);

      expect(result.payload).toEqual(incoming);
      expect(result.wasTransformed).toBe(false);
    });

    it("does not affect a concurrent content operation", () => {
      const incoming: OperationPayload = { kind: "insert", position: 3, text: "x" };
      const against: OperationPayload = { kind: "rename", title: "New title" };

      const result = transformPayload(incoming, against, CONTENT_LENGTH);

      expect(result.payload).toEqual(incoming);
      expect(result.wasTransformed).toBe(false);
    });
  });

  describe("set_content (full overwrite, e.g. version restore)", () => {
    it("re-anchors a stale insert to the end of the new content rather than dropping it", () => {
      const incoming: OperationPayload = {
        kind: "insert",
        position: 3,
        text: "still here",
      };
      const against: OperationPayload = {
        kind: "set_content",
        content: "brand new document",
      };

      const result = transformPayload(incoming, against, CONTENT_LENGTH);

      expect(result.payload).toEqual({
        kind: "insert",
        position: 18,
        text: "still here",
      });
      expect(result.wasTransformed).toBe(true);
    });

    it("converts a stale replace into an append-only insert to avoid data loss", () => {
      const incoming: OperationPayload = {
        kind: "replace",
        position: 3,
        length: 4,
        text: "oops",
      };
      const against: OperationPayload = { kind: "set_content", content: "reset" };

      const result = transformPayload(incoming, against, CONTENT_LENGTH);

      expect(result.payload).toEqual({ kind: "insert", position: 5, text: "oops" });
    });
  });
});

describe("conflict-resolver: applyPayload", () => {
  it("applies insert at the correct position", () => {
    const state = applyPayload(
      { content: "hello world", title: "t" },
      { kind: "insert", position: 5, text: "," },
    );
    expect(state.content).toBe("hello, world");
  });

  it("applies delete correctly", () => {
    const state = applyPayload(
      { content: "hello world", title: "t" },
      { kind: "delete", position: 5, length: 6 },
    );
    expect(state.content).toBe("hello");
  });

  it("applies replace correctly", () => {
    const state = applyPayload(
      { content: "hello world", title: "t" },
      { kind: "replace", position: 6, length: 5, text: "there" },
    );
    expect(state.content).toBe("hello there");
  });

  it("clamps out-of-range positions defensively instead of throwing", () => {
    const state = applyPayload(
      { content: "short", title: "t" },
      { kind: "insert", position: 999, text: "!" },
    );
    expect(state.content).toBe("short!");
  });

  it("applies set_content and rename", () => {
    expect(
      applyPayload(
        { content: "old", title: "t" },
        { kind: "set_content", content: "new" },
      ).content,
    ).toBe("new");
    expect(
      applyPayload({ content: "c", title: "old" }, { kind: "rename", title: "new" })
        .title,
    ).toBe("new");
  });
});
