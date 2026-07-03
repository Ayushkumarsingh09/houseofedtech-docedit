/**
 * Defence-in-depth text sanitisation. The rich-text editor persists HTML, so
 * every document body is stripped of executable/dangerous markup before it
 * is ever written to the database or echoed back to another user's browser.
 * This runs in addition to the CSP configured in `next.config.ts`.
 */

const DISALLOWED_TAGS = [
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "link",
  "meta",
  "base",
  "form",
];

const EVENT_HANDLER_ATTR_PATTERN = /\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const JAVASCRIPT_URI_PATTERN = /(href|src)\s*=\s*("|')\s*javascript:[^"']*("|')/gi;

export function sanitizeHtml(html: string): string {
  let sanitized = html;

  for (const tag of DISALLOWED_TAGS) {
    const openClose = new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi");
    const selfClosing = new RegExp(`<${tag}[^>]*\\/?>`, "gi");
    sanitized = sanitized.replace(openClose, "").replace(selfClosing, "");
  }

  sanitized = sanitized.replace(EVENT_HANDLER_ATTR_PATTERN, "");
  sanitized = sanitized.replace(JAVASCRIPT_URI_PATTERN, "$1=$2#$3");

  return sanitized;
}

/** Strips all HTML tags — used for plain-text excerpts, search indexing, etc. */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function sanitizePlainText(input: string): string {
  return input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();
}
