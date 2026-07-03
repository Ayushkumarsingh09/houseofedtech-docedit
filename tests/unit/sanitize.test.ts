import { describe, expect, it } from "vitest";

import { sanitizeHtml, sanitizePlainText, stripHtml } from "@/lib/sanitize";

describe("sanitizeHtml", () => {
  it("strips <script> tags entirely", () => {
    expect(sanitizeHtml("<p>hi</p><script>alert(1)</script>")).toBe("<p>hi</p>");
  });

  it("strips inline event handler attributes", () => {
    expect(sanitizeHtml('<img src="x" onerror="alert(1)">')).not.toMatch(/onerror/);
  });

  it("neutralizes javascript: URIs", () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">click</a>')).not.toMatch(
      /javascript:/,
    );
  });

  it("leaves safe markup untouched", () => {
    const safe = "<p>Hello <strong>world</strong></p>";
    expect(sanitizeHtml(safe)).toBe(safe);
  });
});

describe("stripHtml", () => {
  it("removes tags and collapses whitespace", () => {
    expect(stripHtml("<p>Hello</p>\n<p>World</p>")).toBe("Hello World");
  });
});

describe("sanitizePlainText", () => {
  it("removes control characters and trims", () => {
    expect(sanitizePlainText("  hello\u0000world  ")).toBe("helloworld");
  });
});
