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

## Deployment checklist

1. Trigger a new deployment. During `pnpm build` the logs must include either `[migrate] prisma migrate deploy: OK` or `[migrate] fallback to prisma db push (preview only)`.
2. After the deploy is live, hit `/api/health/db` and ensure it returns `200`.
3. Call `/api/groups` (GET) and `/api/groups` (POST) to verify the API responds with real data and no `DB_NOT_INITIALIZED` banner appears in the UI.
4. If the preview build still lands before migrations run, the runtime bootstrap logs `[bootstrap] ...` messages exactly once per process.

## Manual preview bootstrap endpoint

- Endpoint: `/api/ops/db/init` (GET for status, POST to run the bootstrap).
- Access control: only available on preview deployments and to emails listed in `OPS_DB_INIT_EMAIL_ALLOWLIST`.
- Response payload includes the tables that exist/missing and whether the command attempted a `prisma db push`.
- The endpoint forces the same direct-connection `prisma db push --accept-data-loss` used by the runtime bootstrap and logs `[ops.db.init] ...` lines.
- Use this endpoint when a preview build fails to initialize automatically—trigger a POST once and confirm `/api/health/db` turns healthy.

## Keep Neon endpoints stable

- Use the same Neon endpoint/branch for every Vercel deployment.
- Avoid changing `ep-*` identifiers per deploy; pin the endpoint in Neon if you need to reuse existing data.
- Both `DATABASE_URL` and `DIRECT_URL` must point to the same database even for preview builds.
