# Database

Nimbus Docs uses **PostgreSQL** (hosted on [Neon](https://neon.tech), serverless
Postgres) via **Prisma ORM**. The full schema lives in
[`prisma/schema.prisma`](../prisma/schema.prisma).

## Entity-relationship diagram

```mermaid
erDiagram
    USER ||--o{ DOCUMENT : owns
    USER ||--o{ COLLABORATOR : "is a"
    USER ||--o{ SESSION : has
    USER ||--o| SETTINGS : has
    USER ||--o{ NOTIFICATION : receives
    USER ||--o{ VERSION : authors
    USER ||--o{ OPERATION : authors
    USER ||--o{ AUDIT_LOG : performs

    DOCUMENT ||--o{ COLLABORATOR : "shared with"
    DOCUMENT ||--o{ VERSION : has
    DOCUMENT ||--o{ SNAPSHOT : has
    DOCUMENT ||--o{ OPERATION : has
    DOCUMENT ||--o{ AUDIT_LOG : "target of"
    DOCUMENT ||--o{ NOTIFICATION : "about"

    SNAPSHOT ||--o| VERSION : "pointed to by"

    USER {
        string id PK
        string email UK
        string name
        string passwordHash
        string avatarColor
        datetime createdAt
        datetime updatedAt
    }

    DOCUMENT {
        string id PK
        string title
        string ownerId FK
        text content
        json contentJson
        int version "optimistic lock counter"
        boolean isArchived
        boolean isDeleted
        datetime createdAt
        datetime updatedAt
    }

    COLLABORATOR {
        string id PK
        string documentId FK
        string userId FK
        enum role "OWNER | EDITOR | VIEWER"
        datetime invitedAt
    }

    SNAPSHOT {
        string id PK
        string documentId FK
        text content
        json contentJson
        string hash "sha256"
        int sizeBytes
        datetime createdAt
    }

    VERSION {
        string id PK
        string documentId FK
        string createdById FK
        string label
        int versionNumber
        string contentSnapshotId FK, UK
        json changesSummary
        boolean isAutomatic
        datetime createdAt
    }

    OPERATION {
        string id PK
        string operationId UK "client idempotency key"
        string clientId
        string documentId FK
        string userId FK
        enum type "INSERT | DELETE | REPLACE | RENAME | SET_CONTENT"
        json payload
        int baseVersion
        int resultVersion
        int sequenceNumber
        datetime clientTimestamp
        datetime serverTimestamp
        string hash
        enum status "APPLIED | REJECTED | CONFLICT_RESOLVED"
        json conflictResolution
    }

    SESSION {
        string id PK
        string userId FK
        string refreshTokenHash UK
        string userAgent
        string ipAddress
        datetime expiresAt
        datetime revokedAt
    }

    AUDIT_LOG {
        string id PK
        string userId FK
        string documentId FK
        string action
        json metadata
        string ipAddress
        datetime createdAt
    }

    SETTINGS {
        string id PK
        string userId FK, UK
        enum theme "LIGHT | DARK | SYSTEM"
        int editorFontSize
        int autoSaveIntervalMs
        boolean emailNotifications
    }

    NOTIFICATION {
        string id PK
        string userId FK
        enum type
        string title
        string body
        string documentId FK
        boolean isRead
        datetime createdAt
    }
```

## Table reference

| Table | Purpose |
| --- | --- |
| `users` | Account identity + bcrypt password hash. |
| `sessions` | Hashed refresh tokens for rotation/revocation (never stores the raw token). |
| `settings` | Per-user preferences (theme, editor font size, autosave interval). |
| `documents` | The document aggregate. `version` is the optimistic-locking counter incremented on every accepted mutation. |
| `collaborators` | Many-to-many join between users and documents, carrying the `Role`. |
| `snapshots` | Immutable content blobs, integrity-hashed with SHA-256. |
| `versions` | Git-commit-like pointer to a snapshot, with label/author/diff-stat metadata — this is the user-facing "version history" timeline. |
| `operations` | Append-only log of every accepted sync operation — the audit trail the conflict resolver and pull endpoint rely on. |
| `audit_logs` | Security/observability trail of every privileged action. |
| `notifications` | In-app notifications (e.g. "you were added to a document"). |

## Indexes & constraints

- `documents(ownerId)`, `documents(updatedAt)` — dashboard listing and
  ownership lookups.
- `collaborators(documentId, userId)` **unique** — a user has exactly one
  role per document; also indexed on `userId` for "documents shared with
  me" queries.
- `operations(operationId)` **unique** — idempotency.
- `operations(clientId, documentId, sequenceNumber)` **unique** — detects
  duplicate/out-of-order client sequence numbers.
- `operations(documentId, resultVersion)` — powers the pull endpoint's
  "everything since version N" query.
- `versions(documentId, versionNumber)` **unique** — Git-like monotonic
  numbering per document.
- `snapshots(hash)` — supports future content de-duplication.
- `sessions(refreshTokenHash)` **unique** — O(1) refresh-token lookup
  without ever storing the raw token.
- Every foreign key that represents ownership (`Document.ownerId`,
  `Collaborator.documentId/userId`, `Version.documentId`,
  `Operation.documentId`) cascades on delete so removing a document (or a
  user, where safe) can never leave orphaned rows.

## Optimistic locking & transactions

`documents.version` is the concurrency-control column:

```sql
UPDATE documents
SET version = $newVersion, content = $content, title = $title
WHERE id = $documentId AND version = $expectedVersion;
```

If this affects zero rows, another request already advanced the version —
the sync service re-reads the latest state and retries the whole
transform-and-apply cycle (up to 5 attempts) rather than overwriting the
concurrent write. See `src/services/sync.service.ts`.

Every multi-statement write that must be atomic (creating a version +
snapshot together, restoring a version while snapshotting the pre-restore
state, applying a batch of operations alongside the document version bump)
is wrapped in a Prisma `$transaction`.

## Migrations & seed data

```bash
npm run db:migrate       # prisma migrate dev — create + apply a migration
npm run db:migrate:deploy  # prisma migrate deploy — apply in CI/production
npm run db:seed          # prisma/seed.ts — demo user, documents, and version history
npm run db:studio        # Prisma Studio — browse the database visually
```

Migration history lives in [`prisma/migrations/`](../prisma/migrations/).
