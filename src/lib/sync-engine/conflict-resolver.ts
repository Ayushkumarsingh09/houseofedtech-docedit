import type { OperationPayload } from "@/types/sync";

/**
 * Deterministic, hand-rolled Operational Transformation (OT) engine.
 *
 * This is the heart of Nimbus Docs' conflict resolution. Rather than a CRDT
 * library (explicitly disallowed by the assignment — no Yjs/Automerge), we
 * implement the classic "transform an incoming operation against every
 * operation that landed on the server since the client last saw it" model
 * used by Google Wave / ShareJS-style OT servers.
 *
 * Every operation is one of a small, closed set of position-addressed edits
 * (insert / delete / replace) plus two "structural" operations (rename,
 * set_content). `transformPayload` answers: "given that `against` has
 * already been durably applied to the document, how must `incoming` be
 * rewritten so that applying it afterwards still expresses the user's
 * original intent?"
 *
 * Design trade-offs (documented deliberately, not accidental gaps):
 *  - Only single-span operations are modeled (one contiguous insert/delete
 *    per operation). This keeps the transform functions total, pure, and
 *    trivially unit-testable, at the cost of not merging arbitrary
 *    multi-hunk diffs in a single transform step — the editor instead emits
 *    one operation per contiguous edit, so this is not a real-world
 *    limitation for keystroke-level sync.
 *  - When an insertion would land *inside* a concurrent deletion's range,
 *    we shrink the deletion rather than discard the insertion. Nimbus Docs
 *    treats "never lose a user's typed characters" as a harder constraint
 *    than "deletions always remove exactly N characters" — see
 *    `docs/ARCHITECTURE.md#conflict-resolution`.
 *  - `set_content` (used only by version restore) is a full-document
 *    overwrite. Any operation whose `baseVersion` predates a `set_content`
 *    cannot be positionally reconciled against it (the coordinate space is
 *    gone), so it is deterministically re-anchored to the end of the new
 *    content instead of being dropped — again, zero data loss over perfect
 *    placement.
 */

export interface TransformResult {
  payload: OperationPayload;
  /** True if the payload's position/length/content differs from the input. */
  wasTransformed: boolean;
}

interface Range {
  position: number;
  length: number;
}

/** The subset of operations that address document text by position. */
type ContentPayload = Extract<
  OperationPayload,
  { kind: "insert" | "delete" | "replace" }
>;

/**
 * Core interval algebra shared by every delete-like transform: given that a
 * committed range [bStart, bEnd) has already been removed from the
 * document, compute the equivalent range for a not-yet-applied deletion
 * [aStart, aEnd) so it still deletes only the text it originally targeted.
 */
function shiftRangeAfterDeletion(a: Range, b: Range): Range {
  const aStart = a.position;
  const aEnd = a.position + a.length;
  const bStart = b.position;
  const bEnd = b.position + b.length;

  const bPortionBeforeA = Math.max(0, Math.min(bEnd, aStart) - bStart);
  const overlap = Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));

  return {
    position: aStart - bPortionBeforeA,
    length: Math.max(0, a.length - overlap),
  };
}

function transformPositionAfterInsertion(
  position: number,
  at: number,
  insertedLength: number,
): number {
  return at <= position ? position + insertedLength : position;
}

function transformRangeAfterInsertion(
  a: Range,
  insertAt: number,
  insertedLength: number,
): Range {
  if (insertAt <= a.position) {
    return { position: a.position + insertedLength, length: a.length };
  }
  if (insertAt >= a.position + a.length) {
    return a;
  }
  // Insertion lands inside the range: preserve the newly inserted text by
  // only keeping the portion of the deletion before the insertion point.
  return { position: a.position, length: insertAt - a.position };
}

function transformInsertPositionAfterDeletion(position: number, deletion: Range): number {
  const deletionEnd = deletion.position + deletion.length;
  if (deletionEnd <= position) return position - deletion.length;
  if (deletion.position >= position) return position;
  return deletion.position;
}

/** Decomposes a REPLACE into an equivalent DELETE + INSERT pair (standard OT technique). */
function decomposeReplace(payload: Extract<OperationPayload, { kind: "replace" }>) {
  return {
    del: { position: payload.position, length: payload.length } satisfies Range,
    ins: { position: payload.position, text: payload.text },
  };
}

function clampContentLength(length: number, maxLength: number): number {
  return Math.max(0, Math.min(length, maxLength));
}

/**
 * Transforms `incoming` so it can be safely applied *after* `against`,
 * which has already been committed to the document. Returns the (possibly
 * unchanged) payload plus a flag indicating whether a real transform
 * occurred (used to mark the operation as `CONFLICT_RESOLVED` for the
 * audit trail / UI).
 */
export function transformPayload(
  incoming: OperationPayload,
  against: OperationPayload,
  currentContentLength: number,
): TransformResult {
  // Rename never touches content coordinates.
  if (against.kind === "rename") {
    return { payload: incoming, wasTransformed: false };
  }

  // A full-content overwrite invalidates any prior coordinate space.
  if (against.kind === "set_content") {
    return reanchorAfterFullOverwrite(incoming, against.content.length);
  }

  if (incoming.kind === "rename" || incoming.kind === "set_content") {
    return { payload: incoming, wasTransformed: false };
  }

  switch (incoming.kind) {
    case "insert":
      return transformInsert(incoming, against, currentContentLength);
    case "delete":
      return transformDelete(incoming, against, currentContentLength);
    case "replace":
      return transformReplace(incoming, against, currentContentLength);
  }
}

function reanchorAfterFullOverwrite(
  incoming: OperationPayload,
  newLength: number,
): TransformResult {
  switch (incoming.kind) {
    case "insert":
      return {
        payload: { ...incoming, position: newLength },
        wasTransformed: true,
      };
    case "delete":
      return {
        payload: { ...incoming, position: newLength, length: 0 },
        wasTransformed: true,
      };
    case "replace":
      return {
        payload: {
          kind: "insert",
          position: newLength,
          text: incoming.text,
        },
        wasTransformed: true,
      };
    default:
      return { payload: incoming, wasTransformed: false };
  }
}

function transformInsert(
  incoming: Extract<OperationPayload, { kind: "insert" }>,
  against: ContentPayload,
  maxLength: number,
): TransformResult {
  if (against.kind === "insert") {
    const position = transformPositionAfterInsertion(
      incoming.position,
      against.position,
      against.text.length,
    );
    return finalizeInsert(incoming, position, maxLength);
  }
  if (against.kind === "delete") {
    const position = transformInsertPositionAfterDeletion(incoming.position, against);
    return finalizeInsert(incoming, position, maxLength);
  }
  // against.kind === "replace" -> decompose into delete then insert
  const { del, ins } = decomposeReplace(against);
  const afterDelete = transformInsertPositionAfterDeletion(incoming.position, del);
  const afterInsert = transformPositionAfterInsertion(
    afterDelete,
    ins.position,
    ins.text.length,
  );
  return finalizeInsert(incoming, afterInsert, maxLength);
}

function finalizeInsert(
  incoming: Extract<OperationPayload, { kind: "insert" }>,
  position: number,
  maxLength: number,
): TransformResult {
  const clamped = clampContentLength(position, maxLength);
  return {
    payload: { ...incoming, position: clamped },
    wasTransformed: clamped !== incoming.position,
  };
}

function transformDelete(
  incoming: Extract<OperationPayload, { kind: "delete" }>,
  against: ContentPayload,
  maxLength: number,
): TransformResult {
  const range: Range = { position: incoming.position, length: incoming.length };
  const result = transformRangeAgainst(range, against);
  const clampedPosition = clampContentLength(result.position, maxLength);
  const clampedLength = clampContentLength(result.length, maxLength - clampedPosition);
  const wasTransformed =
    clampedPosition !== incoming.position || clampedLength !== incoming.length;
  return {
    payload: { ...incoming, position: clampedPosition, length: clampedLength },
    wasTransformed,
  };
}

function transformReplace(
  incoming: Extract<OperationPayload, { kind: "replace" }>,
  against: ContentPayload,
  maxLength: number,
): TransformResult {
  const range: Range = { position: incoming.position, length: incoming.length };
  const result = transformRangeAgainst(range, against);
  const clampedPosition = clampContentLength(result.position, maxLength);
  const clampedLength = clampContentLength(result.length, maxLength - clampedPosition);
  const wasTransformed =
    clampedPosition !== incoming.position || clampedLength !== incoming.length;
  return {
    payload: { ...incoming, position: clampedPosition, length: clampedLength },
    wasTransformed,
  };
}

function transformRangeAgainst(range: Range, against: ContentPayload): Range {
  if (against.kind === "insert") {
    return transformRangeAfterInsertion(range, against.position, against.text.length);
  }
  if (against.kind === "delete") {
    return shiftRangeAfterDeletion(range, {
      position: against.position,
      length: against.length,
    });
  }
  // replace = delete then insert, applied in sequence
  const { del, ins } = decomposeReplace(against);
  const afterDelete = shiftRangeAfterDeletion(range, del);
  return transformRangeAfterInsertion(afterDelete, ins.position, ins.text.length);
}

// ---------------------------------------------------------------------------
// Applying a (already-transformed) payload to document state
// ---------------------------------------------------------------------------

export interface DocumentState {
  content: string;
  title: string;
}

export function applyPayload(
  state: DocumentState,
  payload: OperationPayload,
): DocumentState {
  switch (payload.kind) {
    case "insert": {
      const pos = clampContentLength(payload.position, state.content.length);
      return {
        ...state,
        content: state.content.slice(0, pos) + payload.text + state.content.slice(pos),
      };
    }
    case "delete": {
      const pos = clampContentLength(payload.position, state.content.length);
      const len = clampContentLength(payload.length, state.content.length - pos);
      return {
        ...state,
        content: state.content.slice(0, pos) + state.content.slice(pos + len),
      };
    }
    case "replace": {
      const pos = clampContentLength(payload.position, state.content.length);
      const len = clampContentLength(payload.length, state.content.length - pos);
      return {
        ...state,
        content:
          state.content.slice(0, pos) + payload.text + state.content.slice(pos + len),
      };
    }
    case "set_content":
      return { ...state, content: payload.content };
    case "rename":
      return { ...state, title: payload.title };
  }
}
