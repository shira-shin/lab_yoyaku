# Operations runbook

## Required Vercel environment variables

Set the following keys on the Vercel project. Keep `DATABASE_URL` and `DIRECT_URL` aligned with the same Neon endpoint (e.g. `ep-bitter-leaf-a1bq8tp9`).

| Key | Value | Scope |
| --- | --- | --- |
| `DATABASE_URL` | Neon pooler connection string | Production & Preview |
| `DIRECT_URL` | Same Neon database without the `-pooler` host | Production & Preview |
| `RUN_MIGRATIONS` | `1` | Production & Preview |
| `ALLOW_MIGRATE_ON_VERCEL` | `1` (enables `prisma migrate deploy` during builds) | Production & Preview (Preview may be enough) |
| `ALLOW_RUNTIME_BOOTSTRAP` | `1` while we still need the preview safety net | Preview only |
| `OPS_DB_INIT_EMAIL_ALLOWLIST` | Comma-separated admin emails allowed to call `/api/ops/db/init` | Preview only |
| `OPS_DB_ADMIN_EMAIL_ALLOWLIST` | Admin emails allowed to call `/api/ops/db/deploy` and `/api/ops/db/repair` | Production & Preview |

## Deployment checklist

1. Trigger a new deployment. During `pnpm build` the logs must include `[migrate] ...` lines from `scripts/migrate-deploy.ts`. A successful deploy prints `[migrate] prisma migrate deploy: OK` and the stats diff line.
2. After the deploy is live, hit `/api/health/db` and ensure it returns `200`.
3. Call `/api/groups` (GET) and `/api/groups` (POST) to verify the API responds with real data and no `DB_NOT_INITIALIZED` banner appears in the UI.
4. If the preview build still lands before migrations run, the runtime bootstrap logs `[bootstrap] ...` messages exactly once per process.

## Automatic P3009 repair during builds

- The build step now runs `pnpm exec tsx ../scripts/migrate-deploy.ts` (from the `web` package).
- The wrapper runs `prisma migrate deploy` and automatically repairs unfinished migrations if Prisma throws `P3009`.
- Repair flow:
  1. Query `_prisma_migrations` for unfinished rows.
  2. Run `prisma migrate resolve --rolled-back <name>` for each pending record (logged as `[repair] rolled-back <name>`).
  3. Re-run `prisma migrate deploy`.
- On preview builds (`VERCEL_ENV=preview`) the wrapper falls back to `prisma db push --accept-data-loss` when both attempts fail.
- The wrapper only runs on Vercel when **both** `RUN_MIGRATIONS=1` and `ALLOW_MIGRATE_ON_VERCEL=1` are set. Otherwise it prints `[migrate] skipped: ...`.

### Manual repair commands

Run the following commands locally when you need to reproduce the automated repair sequence:

```
SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL ORDER BY started_at;
prisma migrate resolve --rolled-back 202409160001_group_enhancements
prisma migrate deploy
```

## Manual preview bootstrap endpoint

- Endpoint: `/api/ops/db/init` (GET for status, POST to run the bootstrap).
- Access control: only available on preview deployments and to emails listed in `OPS_DB_INIT_EMAIL_ALLOWLIST`.
- Response payload includes the tables that exist/missing and whether the command attempted a `prisma db push`.
- The endpoint forces the same direct-connection `prisma db push --accept-data-loss` used by the runtime bootstrap and logs `[ops.db.init] ...` lines.
- Use this endpoint when a preview build fails to initialize automatically—trigger a POST once and confirm `/api/health/db` turns healthy.

## Operational repair endpoints

- Endpoints:
  - `POST /api/ops/db/deploy` runs the same migrate-deploy-with-repair wrapper used in builds.
  - `POST /api/ops/db/repair` reuses the wrapper but forces `DATABASE_URL=DIRECT_URL` to repair failures on the primary connection.
- Access control: only authenticated users whose email is included in `OPS_DB_ADMIN_EMAIL_ALLOWLIST` (or the legacy `OPS_DB_INIT_EMAIL_ALLOWLIST`) can call these endpoints.
- Responses include the `[migrate]`/`[repair]` logs plus migration stats before/after.
- Both endpoints are idempotent; when no migrations are pending the stats remain unchanged and the response still reports success.

## Keep Neon endpoints stable

- Use the same Neon endpoint/branch for every Vercel deployment.
- Avoid changing `ep-*` identifiers per deploy; pin the endpoint in Neon if you need to reuse existing data.
- Both `DATABASE_URL` and `DIRECT_URL` must point to the same database even for preview builds.
