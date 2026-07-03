# Contributing to Nimbus Docs

Thank you for your interest in contributing! This document explains how the
project is organized and the workflow expected for changes.

## Getting started

1. Fork and clone the repository.
2. Copy `.env.example` to `.env.local` and fill in the values (see
   [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for how to provision a free Neon
   Postgres database).
3. Install dependencies and set up the database:

   ```bash
   npm install
   npm run db:migrate
   npm run db:seed
   npm run dev
   ```

4. Open <http://localhost:3000>.

## Branching strategy

- `main` is always deployable — Vercel deploys every push automatically.
- Create feature branches off `main` using the pattern
  `feat/short-description`, `fix/short-description`, `docs/short-description`,
  etc.
- Open a pull request into `main` once your branch is ready for review.

## Commit messages

This repository enforces [Conventional Commits](https://www.conventionalcommits.org/)
via commitlint + Husky. Examples:

```
feat: add version restore confirmation dialog
fix: correct off-by-one in delete/delete transform
docs: document the sync engine retry strategy
test: add coverage for idempotent operation replay
refactor: extract collaborator role assertion into a helper
chore: bump dependencies
```

Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`,
`build`, `ci`, `chore`, `revert`.

## Before opening a pull request

Run the full verification suite locally — the same checks run in CI:

```bash
npm run type-check
npm run lint
npm run format:check
npm run test
npm run build
```

Or all at once:

```bash
npm run verify
```

A pre-commit hook (Husky + lint-staged) automatically lints and formats
staged files; a commit-msg hook validates your commit message.

## Code style

- Strict TypeScript. Avoid `any`; prefer precise types or `unknown` + narrowing.
- Follow the existing feature-based folder structure (see
  [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md#folder-structure)).
- No commented-out code, no leftover `console.log`, no unused
  imports/exports.
- Prefer composition over inheritance and small, focused functions.
- New business logic in `src/services`, new data access in
  `src/repositories`, new request validation in `src/schemas` +
  `src/validators`.

## Testing expectations

- Pure logic (conflict resolution, diffing, utils) → unit tests in
  `tests/unit`.
- Anything touching Prisma/the database → integration tests in
  `tests/integration` (guarded to skip automatically if `DATABASE_URL` isn't
  a Postgres connection string).
- User-facing flows (auth, editor, offline behavior) → Playwright specs in
  `e2e/`.

See [`docs/TESTING.md`](docs/TESTING.md) for the full testing guide.

## Reporting bugs / requesting features

Please open a GitHub issue with a clear description, reproduction steps (for
bugs), and — where relevant — which part of the sync engine or UI is
affected.
