# lab_yoyaku

Lab equipment reservation system monorepo.

## Apps

- `web`: Next.js frontend
- `api`: FastAPI backend

## Development

> **Node / pnpm versions**
>
> The monorepo is pinned to **Node 20.x** and **pnpm 10.18.2**. Use `nvm use` (the repo ships with a `.nvmrc`) followed by
> `corepack enable` / `corepack prepare pnpm@10.18.2 --activate` before running any installs to avoid lockfile drift.

1. Start services
   ```bash
   docker compose -f infra/docker-compose.yml up -d
   ```
2. Run web
   ```bash
   pnpm --filter web dev
   ```
3. Run api
   ```bash
   uvicorn app.main:app --reload --app-dir api
   ```

### Troubleshooting pnpm 403 errors

If dependency installation fails with a `403` status, follow this order of operations:

1. **Confirm registry configuration**
   - `pnpm config get registry` should return `https://registry.npmjs.org/`.
   - Inspect project-level or user-level `.npmrc` files for custom `registry=`, scoped registry entries such as `@*:`, or proxy settings that point to private registries. Comment out or remove incorrect entries.
   - A minimal `.npmrc` with the following content in the project root helps force the correct registry:

     ```ini
     registry=https://registry.npmjs.org/
     strict-ssl=true
     ```

2. **Attempt installation with an explicit registry**
   ```bash
   pnpm --filter web install --registry=https://registry.npmjs.org/
   ```

3. **Check for network or certificate issues**
   ```bash
   npm ping --registry=https://registry.npmjs.org/
   pnpm store prune && pnpm store path
   ```

403 responses typically indicate that traffic is being routed to a private registry requiring authentication or is being blocked by a corporate proxy. Ensure requests are sent to the public npm registry before attempting other workarounds.

### Environment
Set `DATABASE_URL` in `web/.env.local` (or export it in your shell) using the **direct** Neon host with `sslmode=require`. The helper scripts in `web/scripts/` URL-encode the password and reject pooler hosts:

```bash
cd web
./scripts/set-database-url.sh neondb_owner 'YOUR_REAL_PASSWORD' ep-xxxxx.ap-southeast-1.aws.neon.tech neondb
```

```powershell
cd web
./scripts/set-database-url.ps1 -User 'neondb_owner' -PasswordRaw 'YOUR_REAL_PASSWORD' -Host 'ep-xxxxx.ap-southeast-1.aws.neon.tech' -DbName 'neondb'
```

`pnpm build` only runs `prisma migrate deploy` when `RUN_MIGRATIONS=1`. Leave it unset/`0` in environments such as Vercel so that the build logs `Skipping prisma migrate deploy` and only runs `prisma generate`.

### Database operations quick start
See: `web/docs/db-ops.md`

Minimum CI-equivalent checks:

```bash
cd web
# (DATABASE_URL is assumed to be set via the helper scripts)
pnpm run db:migrate:status
pnpm run db:migrate:resolve-rolled
pnpm run db:migrate:deploy
```

#### Vercel deployment checklist

- **Runtime**: Project Settings → General → Node.js Version → `20.x` (mirrors the repo `engines.node`).
- **Environment variables** (Production + Preview):
  - `DATABASE_URL` — Neon direct host URL with `sslmode=require` and URL-encoded password.
  - `RUN_MIGRATIONS` — leave unset or `0` so that builds skip `prisma migrate deploy`.
  - `APP_BASE_URL` — canonical origin used in emails (e.g. `https://<your-domain>`).
  - `APP_SESSION_COOKIE_NAME` — optional override, defaults to `lab_session`.
  - Preview deployments only: `USE_MOCK=true` if you need to disable live database writes temporarily.
- **Database migrations**: run manually from a trusted shell or CI job following [`web/docs/db-ops.md`](web/docs/db-ops.md).
- **Post-deploy verification**: confirm `GET /api/_diag/env` reports the expected base URL and direct database host, and `GET /api/health/db` returns a healthy status.

### DB health check

Run the health endpoint to verify connectivity:

```bash
curl http://localhost:3000/api/health/db
```

In Neon SQL editor you can run:

```sql
select table_schema, table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;
```

## Testing

### Web

Run the linter for the Next.js frontend:

```bash
pnpm --filter ./web lint
```

### API

Execute the FastAPI unit tests:

```bash
cd api
PYTHONPATH=. pytest -q
```
