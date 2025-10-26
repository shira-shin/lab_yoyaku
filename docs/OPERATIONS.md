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

Migrations are orchestrated by `scripts/migrate-deploy.cjs`, a plain CommonJS runner invoked during builds (`pnpm --workspace-root run migrate:deploy`) and via the `/api/ops/db/deploy` endpoint. The runner ensures Prisma always talks to the Neon writer by copying `DIRECT_URL` into `DATABASE_URL`, repairs failed migrations automatically, and only falls back to `prisma db push --accept-data-loss` on preview deployments.

## Deployment checklist

1. Trigger a new deployment. During `pnpm build` the logs must include either `[migrate] deploy: OK`, `[migrate] deploy after resolve: OK`, or `[migrate] db push: OK` (preview only fallback).
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

## pnpm and lockfile maintenance

- The repository pins **Node 20.x** and **pnpm 10.18.2**. Always enable Corepack and prepare the pinned pnpm release before installing dependencies to avoid regenerating the lockfile with an unexpected version.
- Confirm that `pnpm-workspace.yaml` lists `web`, `tools/*`, and `packages/*` so the `tools/tsx-shim` workspace can satisfy `tsx@workspace:*`.

### Regenerating `pnpm-lock.yaml`

Use the following sequence to refresh the lockfile when workspace dependencies change:

```bash
corepack prepare pnpm@10.18.2 --activate
pnpm install --lockfile-only
git add pnpm-lock.yaml
git commit -m "chore(pnpm): regenerate lockfile to include tsx@workspace:*"
```

### Temporary Vercel install override

`vercel.json` temporarily defines `"installCommand": "pnpm install --no-frozen-lockfile"` to let preview builds proceed even if the lockfile is stale. Remove this override as soon as the regenerated lockfile is deployed and Vercel succeeds with `--frozen-lockfile` again.

## Database repair tooling

- `GET/POST /api/ops/db/deploy` executes the CommonJS migrate runner (`scripts/migrate-deploy.cjs`). The runner always rewrites `DATABASE_URL` to `DIRECT_URL` before invoking Prisma so production deployments use the writer endpoint. It resolves `P3009` failures automatically and only falls back to `prisma db push --accept-data-loss` on preview builds. Ensure `RUN_MIGRATIONS=1` and `ALLOW_MIGRATE_ON_VERCEL=1` are present in the environment.
- `POST /api/ops/db/repair` forces the same fallback repair path used by the runner (resolve failed migrations, then preview-only `prisma db push`) when `/api/health/db` reports `db:not-initialized` after a failed build.
