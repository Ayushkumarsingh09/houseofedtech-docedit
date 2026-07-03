# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows its own pragmatic versioning during initial
development (`0.x`).

## [0.1.0] — 2026-07-03

### Added

- Initial release of **Nimbus Docs** for the House of Edtech Full Stack
  assignment.
- Local-first architecture: Dexie/IndexedDB as the client source of truth,
  with zero network calls blocking reads or writes.
- Hand-rolled background synchronization engine: durable outbox queue,
  exponential backoff with jitter, batch push/pull, idempotent operation
  replay, network reachability detection, and BroadcastChannel-based
  cross-tab leader election.
- Deterministic operational-transform conflict resolver supporting
  insert/delete/replace/rename/set_content operations, with documented,
  data-loss-averse tie-breaking rules.
- Git-like version history: automatic snapshots every 25 operations, manual
  snapshots, word-level diff view, and safe restore/rollback.
- JWT-based authentication (access + rotating refresh tokens, httpOnly
  cookies) with Owner/Editor/Viewer role-based authorization enforced at the
  repository layer.
- Rich text editor (Tiptap) with autosave, undo/redo, find & replace, word
  and character counts, and keyboard shortcuts.
- AI add-on features (summarize, continue writing, improve clarity) with
  automatic, dependency-free local fallbacks when no model API key is
  configured.
- Command palette, dark/light/system theme, fully responsive layout.
- Security hardening: strict Zod-validated & size-capped sync payloads, rate
  limiting, CSP + secure headers, HTML sanitization, audit logging, and
  ORM-level tenant isolation.
- Vitest unit + integration test suite and Playwright end-to-end suite
  (desktop + mobile viewports) covering auth, the editor, and offline sync.
- GitHub Actions CI pipeline (lint, type-check, tests, build, e2e) and
  Vercel + Neon Postgres deployment.
