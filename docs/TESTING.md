# Testing Guide

Nimbus Docs has three layers of automated tests, mirroring the assignment's
emphasis on the local-first sync engine specifically.

## Layers

| Layer | Tool | Location | What it covers |
| --- | --- | --- | --- |
| Unit | Vitest + Testing Library | `tests/unit/` | Conflict resolution, diffing, crypto/hash, sanitization, rate limiting, request validation, the Dexie-backed outbox, and a React component (form validation). |
| Integration | Vitest + real Postgres | `tests/integration/` | The sync service end-to-end against a live database: applying operations, deterministic multi-client merges, idempotent replay, and RBAC enforcement. |
| End-to-end | Playwright | `e2e/` | Real browser flows: signup/login, protected routes, document creation, autosave + reload persistence, title rename, version history, and — critically — **offline editing with `context.setOffline(true)`**. |

## Running tests

```bash
npm run test              # unit + integration, single run
npm run test:watch        # watch mode
npm run test:coverage     # with v8 coverage report (text + html + lcov)
npm run test:e2e          # Playwright, all configured browsers
npm run test:e2e:ui       # Playwright's interactive UI mode
```

Integration tests automatically skip themselves
(`describe.skipIf(!DATABASE_URL?.startsWith("postgres"))`) if no real
Postgres connection is configured, so `npm run test` never fails in an
environment without a database — but in CI and local development (where
`.env`/`.env.local` point at a real Neon/Postgres instance) they run for
real, against real Prisma queries.

## What's covered, and why

### Conflict resolution (`tests/unit/conflict-resolver.test.ts`)

Every transform combination is asserted individually and with concrete
before/after values:

- insert vs. insert (both orderings, including the tie-break rule)
- insert vs. delete (before, after, and *inside* the deleted range)
- delete vs. insert (shift, no-op, and the "preserve inserted text" rule)
- delete vs. delete (disjoint, overlapping, and fully-contained ranges)
- `replace` decomposition against another operation
- `rename` is a complete no-op for content transforms (and vice versa)
- `set_content` (version restore) re-anchoring stale operations instead of
  dropping them

Plus `applyPayload` tests verifying the four operation kinds actually
mutate a document string correctly, including defensive clamping of
out-of-range positions so a malformed operation can never throw.

### The sync engine end-to-end (`tests/integration/sync.service.test.ts`)

This is the test that most directly answers the assignment's core ask
("deterministic conflict resolution merging without data loss"):

1. Creates a real user + document in Postgres.
2. Pushes an operation from "Client A", asserts the version and content.
3. Pushes **concurrent** operations from "Client A" and "Client B" that
   both branch from the same base version, and asserts the final merged
   content is exactly what both edits, applied in server-arrival order,
   would produce — with neither edit lost.
4. Replays an already-applied operation (same `operationId`) and asserts
   it is **not** double-applied (idempotency).
5. Attempts a push from a `VIEWER` and asserts it is rejected with
   `ForbiddenError` (authorization).
6. Confirms a `VIEWER` can still pull the latest state (read access is
   allowed; only writes are blocked).

### Offline behavior (`e2e/offline.spec.ts`)

Uses Playwright's `browserContext.setOffline(true)` to simulate a real
network outage:

- Confirms the editor remains fully interactive while offline (no loading
  spinners, no blocked input).
- Confirms the UI surfaces an "Offline" status.
- Restores connectivity and confirms the sync status returns to
  "Synced"/"Syncing" — proving the outbox actually flushes once the network
  recovers.

### The outbox itself (`tests/unit/operation-queue.test.ts`)

Runs against `fake-indexeddb` (no real browser needed) and verifies
sequence-number monotonicity, stable per-tab `clientId`, per-operation
integrity hashing, correct pending-batch retrieval (excluding in-flight
operations), and cleanup after a confirmed sync.

## Coverage

`npm run test:coverage` produces a v8 coverage report under `coverage/`
(also uploaded as a CI artifact). Coverage is intentionally scoped to
`src/**` excluding generated code, environment loading, and the `ui/`
primitive components (which are near-verbatim shadcn/ui output with no
custom logic to test) — see `vitest.config.ts`.

## CI

All three layers run on every push/PR via `.github/workflows/ci.yml`:
unit+integration tests run against an ephemeral GitHub Actions Postgres
service container (with `prisma migrate deploy` applied first), and the
Playwright suite runs against a production build (`next build && next
start`) with its own ephemeral database.
