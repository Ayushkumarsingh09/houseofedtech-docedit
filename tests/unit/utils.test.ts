import { describe, expect, it } from "vitest";

import { countWords, formatBytes, getInitials, truncate } from "@/lib/utils";

describe("formatBytes", () => {
  it("formats zero", () => {
    expect(formatBytes(0)).toBe("0 B");
  });

  it("formats bytes, kilobytes, and megabytes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});

describe("getInitials", () => {
  it("returns first and last initials for multi-word names", () => {
    expect(getInitials("Ayush Kumar Singh")).toBe("AS");
  });

  it("returns a single initial for one-word names", () => {
    expect(getInitials("Ayush")).toBe("A");
  });
});

describe("truncate", () => {
  it("leaves short strings untouched", () => {
    expect(truncate("short", 10)).toBe("short");
  });

  it("truncates long strings with an ellipsis", () => {
    expect(truncate("this is a long sentence", 10)).toBe("this is a…");
  });
});

describe("countWords", () => {
  it("counts words separated by whitespace", () => {
    expect(countWords("hello   world  foo")).toBe(3);
  });

  it("returns 0 for empty or whitespace-only strings", () => {
    expect(countWords("   ")).toBe(0);
    expect(countWords("")).toBe(0);
  });
});
