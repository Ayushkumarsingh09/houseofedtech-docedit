# Deployment Guide

Nimbus Docs is deployed as a single Next.js application on **Vercel**, backed
by a **Neon** (serverless Postgres) database provisioned through Vercel's
native storage marketplace integration.

## Architecture of the deployment

```
GitHub (main branch)
   │  push
   ▼
Vercel (build + deploy)
   │  DATABASE_URL / DIRECT_URL (pooled + direct Neon connection strings)
   ▼
Neon Postgres (serverless, autoscaling, branchable)
```

Every push to `main` triggers an automatic production deployment; every
pull request gets its own Preview Deployment with an isolated URL — both
configured out of the box by Vercel's GitHub integration (no custom YAML
required for the deploy step itself; see `.github/workflows/ci.yml` for the
independent lint/test/build gate that runs regardless of deployment).

## 1. Provision Postgres (Neon via Vercel)

This project's database was provisioned with:

```bash
vercel link                          # link the local project to a Vercel project
vercel install neon --name <db-name> --environment production --environment preview --environment development
```

This automatically:

- Creates a Neon project and database.
- Connects it to the Vercel project.
- Injects `DATABASE_URL` (pooled, via PgBouncer) and `DATABASE_URL_UNPOOLED`
  into the Vercel project's environment variables for all environments.

Prisma Migrate needs a **direct** (non-pooled) connection, so a `DIRECT_URL`
environment variable pointing at `DATABASE_URL_UNPOOLED`'s value must also be
set in the Vercel dashboard (Project → Settings → Environment Variables) —
see `prisma/schema.prisma`'s `directUrl`.

If you'd rather not use the Vercel marketplace, any Postgres 14+ connection
string works — create a project at [neon.tech](https://neon.tech) (or use
Supabase/RDS/local Postgres) and set `DATABASE_URL` / `DIRECT_URL` manually.

## 2. Configure environment variables

Copy `.env.example` and fill in every value. In Vercel, set the same keys
under **Project → Settings → Environment Variables** for the
Production/Preview/Development environments as appropriate:

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Pooled Neon connection string. |
| `DIRECT_URL` | Yes | Unpooled connection string, used only by `prisma migrate`. |
| `AUTH_ACCESS_TOKEN_SECRET` | Yes | `openssl rand -base64 48`. |
| `AUTH_REFRESH_TOKEN_SECRET` | Yes | A **different** random secret. |
| `AUTH_ACCESS_TOKEN_TTL` | No | Defaults to `15m`. |
| `AUTH_REFRESH_TOKEN_TTL` | No | Defaults to `30d`. |
| `OPENAI_API_KEY` | No | Enables model-backed AI features; app works without it. |
| `GOOGLE_GENERATIVE_AI_API_KEY` | No | Alternative AI provider. |
| `NEXT_PUBLIC_APP_URL` | Yes | The deployed origin, e.g. `https://nimbus-docs.vercel.app`. |

## 3. Run database migrations against production

```bash
npx prisma migrate deploy
```

Run this once against the production `DATABASE_URL`/`DIRECT_URL` before (or
immediately after) the first deploy, and again after every migration is
added. In CI, this is exactly what `npm run db:migrate:deploy` does.

## 4. Deploy

### Automatic (recommended)

Connect the GitHub repository to the Vercel project (Vercel Dashboard →
Project → Settings → Git, or `vercel git connect` from the CLI). Every push
to `main` deploys to production automatically; every PR gets a Preview URL.

### Manual (from the CLI)

```bash
vercel build
vercel deploy --prebuilt --prod
```

## 5. Verify production

- Visit the deployed URL and confirm the landing page renders.
- Sign up for a new account, create a document, and confirm autosave.
- Open DevTools → Network → set "Offline", type more content, confirm the
  UI keeps working and shows the offline indicator; go back online and
  confirm the sync indicator returns to "Synced".
- Toggle dark/light mode.
- Run `curl https://<your-domain>/api/health` and confirm `{"status":"ok"}`.

## CI/CD

`.github/workflows/ci.yml` runs on every push/PR to `main`:

1. **Lint & Type Check** — `npm run format:check && npm run lint && npm run type-check`.
2. **Unit & Integration Tests** — spins up an ephemeral Postgres service
   container, runs `prisma migrate deploy`, then `npm run test:coverage`.
3. **Production Build** — `npm run build` against the same ephemeral
   Postgres, gating the pipeline before anything is allowed to merge.
4. **End-to-End Tests** — installs Playwright's Chromium browser and runs
   the full `e2e/` suite against a production build (`next build && next
   start`) with its own ephemeral Postgres database.

Vercel's own build step performs an independent production build + deploy
on every push to `main`, so the code is validated twice: once by GitHub
Actions (fast feedback, blocks merging) and once by Vercel itself (the
actual artifact that gets served to users).

## Local development

```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL/DIRECT_URL + auth secrets
npm run db:migrate
npm run db:seed              # optional demo data
npm run dev                  # http://localhost:3000
```

## Rollback

Vercel keeps every deployment immutable — use **Vercel Dashboard → Deployments
→ [previous deployment] → Promote to Production**, or:

```bash
vercel rollback
```

Database migrations are additive by default; if a migration must be rolled
back, write a new forward migration rather than mutating history (see
[`docs/DATABASE.md`](DATABASE.md)).
