# API Documentation

All endpoints are Next.js Route Handlers under `src/app/api/**`. Unless noted,
requests and responses are JSON, and authenticated endpoints expect the
`nimbus_at` httpOnly access-token cookie (set automatically by the browser
after login — there is nothing for API clients to manage manually inside the
app itself).

Every error response has the shape:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": {} } }
```

| HTTP status | `code` |
| --- | --- |
| 400 | `VALIDATION_ERROR` |
| 401 | `UNAUTHORIZED` |
| 403 | `FORBIDDEN` |
| 404 | `NOT_FOUND` |
| 409 | `CONFLICT` |
| 413 | `PAYLOAD_TOO_LARGE` |
| 429 | `RATE_LIMITED` |
| 500 | `INTERNAL_ERROR` |

## Authentication

### `POST /api/auth/signup`

Creates an account and starts a session.

```jsonc
// Request
{ "name": "Ada Lovelace", "email": "ada@example.com", "password": "Password123" }
```

```jsonc
// 201 Response
{ "user": { "id": "...", "email": "ada@example.com", "name": "Ada Lovelace", "avatarColor": "#6366F1" } }
```

Sets `nimbus_at` (access token, 15m) and `nimbus_rt` (refresh token, 30d,
path-scoped to `/api/auth`) httpOnly cookies. Rate limited (20 req/min/IP).

### `POST /api/auth/login`

```jsonc
{ "email": "ada@example.com", "password": "Password123" }
```

Returns `{ "user": {...} }` and sets the same cookies. `401 UNAUTHORIZED` on
invalid credentials.

### `POST /api/auth/refresh`

Rotates the refresh token using the `nimbus_rt` cookie. No body required.
Returns a fresh `{ "user": {...} }` and re-sets both cookies.

### `POST /api/auth/logout`

Revokes the current session and clears both cookies. `204 No Content`.

### `GET /api/auth/me`

Returns the authenticated user. `401` if not authenticated.

---

## Documents

### `GET /api/documents`

Lists every document the caller owns or collaborates on.

```jsonc
{
  "documents": [
    {
      "id": "...", "title": "Product Roadmap", "ownerId": "...", "ownerName": "Ada",
      "role": "OWNER", "version": 12, "updatedAt": "...", "createdAt": "...",
      "isArchived": false, "excerpt": "Our focus areas...", "collaboratorCount": 2
    }
  ]
}
```

### `POST /api/documents`

```jsonc
{ "title": "Untitled document" } // optional, defaults to "Untitled document"
```

Returns `201 { "document": DocumentDetail }`.

### `GET /api/documents/:id`

Returns the full document (including `content`/`contentJson`) if the caller
has any role on it. `404` if not found or not accessible (identical
response for both — no information leakage about a document's existence).

### `PATCH /api/documents/:id`

```jsonc
{ "title": "New title", "isArchived": true } // both optional
```

Requires `EDITOR`+ for `title`, `OWNER` for `isArchived`.

### `DELETE /api/documents/:id`

Soft-deletes the document. Requires `OWNER`. `204 No Content`.

### `GET /api/documents/:id/collaborators`

Requires any role. Returns collaborator list with roles.

### `POST /api/documents/:id/collaborators`

Requires `OWNER`.

```jsonc
{ "email": "teammate@example.com", "role": "EDITOR" } // or "VIEWER"
```

### `PATCH /api/documents/:id/collaborators/:userId`

Requires `OWNER`. Body: `{ "role": "EDITOR" | "VIEWER" }` (ownership cannot
be transferred through this endpoint).

### `DELETE /api/documents/:id/collaborators/:userId`

Requires `OWNER`. `204 No Content`.

---

## Version history

### `GET /api/documents/:id/versions`

Requires any role. Returns the version timeline (metadata only, no content).

### `POST /api/documents/:id/versions`

Requires `EDITOR`+. Captures a manual snapshot of the current content.

```jsonc
{ "label": "Before major rewrite" } // optional
```

### `GET /api/documents/:id/versions/:versionId`

Requires any role. Returns the version including its full `content` (for
diffing against the current document client-side).

### `POST /api/documents/:id/versions/:versionId/restore`

Requires `EDITOR`+. Restores the document to the target version's content.
Safety net: automatically snapshots the pre-restore state first, so a
restore is itself always reversible. Emits a `SET_CONTENT` operation into
the sync log so other connected clients reconcile it on their next pull.

---

## Sync engine

### `POST /api/sync/push`

The core synchronization endpoint. Requires `EDITOR`+ (viewers receive
`403 FORBIDDEN` — they cannot push mutations, per the assignment's
requirement).

```jsonc
// Request
{
  "documentId": "doc_123",
  "operations": [
    {
      "operationId": "a1b2c3d4-...", // UUID, client-generated
      "clientId": "stable-per-browser-id",
      "documentId": "doc_123",
      "userId": "user_456",
      "type": "INSERT",
      "payload": { "kind": "insert", "position": 42, "text": "hello" },
      "baseVersion": 7,
      "sequenceNumber": 3,
      "clientTimestamp": "2026-07-03T12:00:00.000Z",
      "hash": "…sha256…"
    }
  ]
}
```

```jsonc
// Response
{
  "results": [
    { "operationId": "a1b2c3d4-...", "status": "APPLIED", "resultVersion": 8 }
  ],
  "serverVersion": 8,
  "serverContent": "...the full, merged document content..."
}
```

`status` is one of `APPLIED`, `CONFLICT_RESOLVED` (the operation was
rebased against concurrent edits before being applied), or `REJECTED`
(e.g. `baseVersion` doesn't exist yet, or the resulting document would
exceed the maximum size).

Batches are capped at 200 operations and 2MB total request size
(`413 PAYLOAD_TOO_LARGE` otherwise) — see
[`docs/ARCHITECTURE.md#security`](ARCHITECTURE.md#security).

### `GET /api/sync/pull?documentId=doc_123&sinceVersion=5`

Requires any role. Returns everything that changed after `sinceVersion`.

```jsonc
{
  "documentId": "doc_123",
  "currentVersion": 8,
  "content": "...",
  "contentJson": null,
  "operations": [ /* ServerOperationRecord[] */ ],
  "updatedAt": "..."
}
```

---

## AI add-ons

Both endpoints require the caller to have at least `VIEWER` access to the
referenced document, and are rate limited (20 req/min/user). If no
`OPENAI_API_KEY`/`GOOGLE_GENERATIVE_AI_API_KEY` is configured, a
deterministic local fallback is used instead — the app never breaks or
blocks without a paid key.

### `POST /api/ai/summarize`

```jsonc
{ "documentId": "doc_123", "content": "<p>...</p>" }
```

```jsonc
{ "text": "A concise, at-most-3-sentence summary.", "usedProvider": true }
```

### `POST /api/ai/complete`

```jsonc
{ "documentId": "doc_123", "content": "<p>...</p>", "mode": "continue" } // or "improve"
```

```jsonc
{ "text": "...", "usedProvider": false }
```

---

## Settings

### `GET /api/settings`

Returns the caller's `Settings` row.

### `PATCH /api/settings`

```jsonc
{
  "theme": "DARK",             // optional
  "editorFontSize": 18,        // optional, 12–24
  "autoSaveIntervalMs": 800,   // optional, 200–5000
  "emailNotifications": true   // optional
}
```

---

## Health

### `GET /api/health`

Unauthenticated liveness probe used by the client's network monitor and
suitable for uptime checks. `{ "status": "ok", "timestamp": "..." }`.
