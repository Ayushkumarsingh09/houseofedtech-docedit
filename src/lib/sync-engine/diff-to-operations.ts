import { diffChars } from "diff";

import type { OperationPayload } from "@/types/sync";

/**
 * Converts a before/after content pair into the smallest sequence of
 * insert/delete/replace payloads that reproduce the change. This is what
 * lets the editor's autosave emit fine-grained, mergeable operations
 * instead of a coarse `set_content` on every keystroke — essential for
 * meaningful conflict resolution between two people editing different
 * paragraphs at once.
 */
export function diffToOperations(previous: string, next: string): OperationPayload[] {
  if (previous === next) return [];

  const parts = diffChars(previous, next);
  const payloads: OperationPayload[] = [];
  let cursor = 0;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;

    if (!part.added && !part.removed) {
      cursor += part.value.length;
      continue;
    }

    const next_ = parts[i + 1];

    if (part.removed && next_?.added) {
      payloads.push({
        kind: "replace",
        position: cursor,
        length: part.value.length,
        text: next_.value,
        deletedText: part.value,
      });
      cursor += next_.value.length;
      i += 1;
      continue;
    }

    if (part.removed) {
      payloads.push({
        kind: "delete",
        position: cursor,
        length: part.value.length,
        deletedText: part.value,
      });
      continue;
    }

    // part.added
    payloads.push({ kind: "insert", position: cursor, text: part.value });
    cursor += part.value.length;
  }

  return payloads;
}
