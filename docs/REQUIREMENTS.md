# Assignment Requirement Tracking Matrix

Every requirement from the House of Edtech Full Stack Developer assignment
(Local-First, Collaborative Document Editor) mapped to the exact
implementation. Status legend: ✅ Done · 🟡 Partial / documented trade-off.

## Technology stack

| Requirement | Status | Implementation |
| --- | --- | --- |
| Next.js 16 + TypeScript | ✅ | `package.json` (`next@16.2.10`), `tsconfig.json` (`strict: true`, `noUncheckedIndexedAccess`) |
| Database (PostgreSQL/MySQL/MongoDB) | ✅ | PostgreSQL via Neon + Prisma — `prisma/schema.prisma` |

## Functionality

| Requirement | Status | Implementation |
| --- | --- | --- |
| Local-first architecture, zero blocking network calls | ✅ | `src/lib/offline/db.ts` (Dexie), `src/features/editor/hooks/use-document-sync.ts` reads Dexie first, network is background-only |
| Background sync engine (push/pull without destroying offline work) | ✅ | `src/lib/sync-engine/sync-engine.ts`, `operation-queue.ts`; server-side `src/services/sync.service.ts` |
| Version history & time travel, safe restore | ✅ | `prisma/schema.prisma` (`Snapshot`, `Version`), `src/services/version.service.ts`, `src/features/versions/components/version-history-dialog.tsx` |
| Robust server-side validation of sync payloads | ✅ | `src/schemas/sync.schema.ts` (size caps), `src/validators/validate-request.ts` (`assertBodySize`, `readJsonBody`) |
| Clean, responsive, accessible UI (Tailwind/shadcn/Radix) | ✅ | `src/components/ui/*`, semantic headings (`CardTitle` → `<h3>`), ARIA labels throughout, Playwright a11y-relevant assertions |
| AI add-on features | ✅ | `src/services/ai.service.ts`, `/api/ai/summarize`, `/api/ai/complete`, `src/features/ai/components/ai-assist-menu.tsx` — works with or without an API key |
| Deployment + CI/CD | ✅ | Vercel + Neon (`docs/DEPLOYMENT.md`), `.github/workflows/ci.yml` |
| Code optimization (splitting, caching, SSR) | ✅ | App Router code splitting, dynamic AI SDK imports, `next/font`, debounced sync pipeline (`docs/ARCHITECTURE.md#performance`) |
| Real-world considerations (scalability, error handling, security) | ✅ | `docs/ARCHITECTURE.md#real-world-considerations`, global `error.tsx`/`not-found.tsx`, `src/lib/errors.ts` typed error hierarchy |

## Must have

| Requirement | Status | Implementation |
| --- | --- | --- |
| Secure authentication (JWT-based) | ✅ | `src/lib/jwt.ts`, `src/services/auth.service.ts`, httpOnly rotating-refresh cookies |
| Roles: Owner, Editor, Viewer | ✅ | `Role` enum in `prisma/schema.prisma`; `ROLE_RANK` in `src/constants/index.ts` |
| Viewers cannot push state updates | ✅ | `pushOperations` calls `assertRole(role, "EDITOR")` before touching the sync engine — verified in `tests/integration/sync.service.test.ts` ("rejects pushes from a viewer") |
| Mitigate malformed/massive sync payload (OOM) | ✅ | `SYNC_LIMITS` in `src/constants/index.ts`, enforced in `src/schemas/sync.schema.ts` and `src/validators/validate-request.ts` *before* JSON parsing |
| Row-level security / strict ORM scoping for tenant isolation | ✅ | `src/repositories/access.repository.ts` is the single choke point for "does this user have access"; documented in `docs/ARCHITECTURE.md#security` |

## Good to have

| Requirement | Status | Implementation |
| --- | --- | --- |
| Integration & end-to-end testing | ✅ | `tests/integration/sync.service.test.ts` (real Postgres), `e2e/*.spec.ts` (Playwright, desktop + mobile) |
| AI libraries (AI-SDK / OpenAI / Gemini / Groq) | ✅ | Vercel `ai` SDK with `@ai-sdk/openai` and `@ai-sdk/google` providers |

## Evaluation criteria

| Criterion | Where it's demonstrated |
| --- | --- |
| Offline-sync completeness & correctness | `e2e/offline.spec.ts`, `src/lib/sync-engine/*` |
| Deterministic conflict resolution, no data loss | `tests/unit/conflict-resolver.test.ts` (18 cases), `tests/integration/sync.service.test.ts` (real concurrent merge) |
| Functional version history | `src/services/version.service.ts`, `e2e/editor.spec.ts` ("opens the version history dialog") |
| Data validation | `src/schemas/*`, `src/validators/validate-request.ts` |
| Authentication & authorization | `src/services/auth.service.ts`, `src/repositories/access.repository.ts` |
| UI friendliness, responsiveness, connection status | `src/features/sync/components/sync-status-indicator.tsx`, Playwright `mobile-chrome` project |
| Accessibility | Semantic headings, labeled form fields, `aria-live` sync status, keyboard-navigable command palette |
| Code structure & complex state sync logic | Feature-based architecture (`docs/ARCHITECTURE.md#folder-structure`), pure/testable `conflict-resolver.ts` |
| Documentation | This file + `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/DATABASE.md`, `docs/DEPLOYMENT.md`, `docs/TESTING.md` |
| Optimization (no lag while typing) | Debounced diff/enqueue pipeline decoupled from the editor's own render path — see `docs/ARCHITECTURE.md#performance` |
| Testing coverage & effectiveness around sync | `tests/unit/conflict-resolver.test.ts`, `tests/unit/operation-queue.test.ts`, `tests/integration/sync.service.test.ts` |
| Deployment & CI/CD | `.github/workflows/ci.yml`, Vercel auto-deploy on push |
| Real-world architectural challenges | `docs/ARCHITECTURE.md#real-world-considerations` (document size growth, rate limiter/leader-election scaling, realtime vs. polling trade-off) |

## Submission guidelines

| Requirement | Status |
| --- | --- |
| Share GitHub repository + live deployment | ✅ See README "Live Demo" section |
| Name, GitHub, and LinkedIn in the application footer | ✅ `src/components/layout/site-footer.tsx`, rendered on every page |
