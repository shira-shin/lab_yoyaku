# Operations runbook

## Vercel database bootstrap

To guarantee the first deployment creates all Prisma tables:

1. Set the following environment variables in the Vercel project (Production **and** Preview):
   - `DATABASE_URL` — Neon pooler endpoint for the production database/branch. Keep the endpoint fixed (e.g. `ep-bitter-leaf-a1bq8tp9`).
   - `DIRECT_URL` — The same database via the direct host (identical credentials, no `-pooler`).
   - `RUN_MIGRATIONS=1`
   - `ALLOW_MIGRATE_ON_VERCEL=1`
2. Trigger a new deployment. The build logs will include `[migrate] prisma migrate deploy: OK`. On preview deployments a failed migration automatically falls back to `prisma db push --accept-data-loss`.
3. Visit `/api/health/db` after the deploy finishes and confirm it returns `200`.
4. Hit `/api/groups` (GET) and `/api/groups` (POST) to verify the API responds with real data (no `DB_NOT_INITIALIZED`).

## Runtime safety net (preview only)

If a preview deployment still reaches the API before migrations run, enable the runtime bootstrap once per process:

- Add `ALLOW_RUNTIME_BOOTSTRAP=1` to the Vercel environment (Preview only).
- When the API detects that `Group`, `GroupMember`, and `Reservation` tables are missing it will execute `prisma db push --accept-data-loss` exactly once and log the `[db:init]` messages.

## Keep Neon endpoints stable

- Use the same Neon endpoint/branch for every Vercel deployment.
- Avoid changing `ep-*` identifiers per deploy; pin the endpoint in Neon if you need to reuse existing data.
- Both `DATABASE_URL` and `DIRECT_URL` must point to the same database even for preview builds.
