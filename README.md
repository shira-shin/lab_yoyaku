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
Set both `DATABASE_URL` and `DIRECT_URL` in `web/.env.local` (or export them in your shell). See [Database URLs: runtime vs migrate](#database-urls-runtime-vs-migrate) for requirements. The helper scripts in `web/scripts/` URL-encode the password and output both env vars:

```bash
cd web
./scripts/set-database-url.sh neondb_owner 'YOUR_REAL_PASSWORD' ep-xxxxx.ap-southeast-1.aws.neon.tech neondb
```

```powershell
cd web
./scripts/set-database-url.ps1 -User 'neondb_owner' -PasswordRaw 'YOUR_REAL_PASSWORD' -Host 'ep-xxxxx.ap-southeast-1.aws.neon.tech' -DbName 'neondb'
```

`pnpm build` only runs `prisma migrate deploy` when `RUN_MIGRATIONS=1`. Leave it unset/`0` in environments such as Vercel so that the build logs `Skipping prisma migrate deploy` and only runs `prisma generate`.

## Database URLs: runtime vs migrate

### How to fix `P2021: public."User" does not exist`

1. Deploy and open `/api/health/db` to confirm runtime connection details.
   - `runtime.DATABASE_URL` (host / db / hasPooler)
   - `userTable`: `present` / `absent`
2. In GitHub Secrets set `DIRECT_URL` to the **Direct** version of that same database.
   - Same user/password/dbname/query; remove only `-pooler` from the hostname.
3. Run **Actions → Bootstrap DB (deploy or push)**.
4. Reload `/api/health/db` and confirm `userTable: present`.

### First-time DB bootstrap
1. Ensure Vercel env:
   - `DATABASE_URL` = pooler
   - `DIRECT_URL`   = Direct (no "-pooler")
2. Run GitHub Actions → Bootstrap DB (deploy or push)
   - It runs `prisma migrate deploy` first, falls back to `prisma db push`
3. Open the app and try login again.

### DB bootstrap (empty DB -> create tables)
- 初回起動や空DBで `P2021: public."User" does not exist` が出る場合：
  1. GitHub Secrets に `DIRECT_URL`（Neon **Direct** URL, no `-pooler`）を登録
  2. Actions → **Bootstrap DB (deploy or push)** を手動実行
     - `migrate deploy` を試行、無ければ `db push` にフォールバックしてテーブルを作成
  3. `/api/health/db` で `userTable: present` を確認

### URLs
- `DATABASE_URL`: runtime 接続。**pooler 可**（例: `ep-xxxx-**pooler**.region.aws.neon.tech`）
- `DIRECT_URL`: Prisma の `generate`/`migrate` 用。**Direct 必須**（`-pooler` を含まない）

`web/prisma/schema.prisma`:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")   // ランタイム：pooler可
  directUrl = env("DIRECT_URL")     // migrate/generate：Direct必須
}
```

### Migrations policy

Vercel では `RUN_MIGRATIONS === '1' && VERCEL !== '1'` のため自動実行しません。

本番 DB への反映は One-off Workflow を用います：

1. GitHub Secrets に `DIRECT_URL`（Direct URL）を登録
2. Actions → **Run Prisma Migrate (one-off)** → Run

初回のみテーブル未作成で 500 が出る場合は、Actions → **Bootstrap DB (deploy or push)** を実行してテーブルを作成（`migrate deploy` に成功すればそのまま継続、失敗時は `db push` にフォールバック）。

#### Local tips

```bash
# Local (Direct で)
export DIRECT_URL='postgresql://... (no -pooler) ...'
export DATABASE_URL="$DIRECT_URL"
pnpm -C web prisma migrate deploy
```

#### Vercel deployment checklist

- **Runtime**: Project Settings → General → Node.js Version → `20.x` (mirrors the repo `engines.node`).
- **Environment variables** (Production + Preview):
  - `DATABASE_URL` — Neon pooler host URL with `sslmode=require` and URL-encoded password.
  - `DIRECT_URL` — Neon direct host URL with `sslmode=require` and URL-encoded password (no `-pooler`).
  - `RUN_MIGRATIONS` — leave unset or `0` so that builds skip `prisma migrate deploy`.
  - `APP_BASE_URL` — canonical origin used in emails (e.g. `https://<your-domain>`).
  - `APP_SESSION_COOKIE_NAME` — optional override, defaults to `lab_session`.
  - Preview deployments only: `USE_MOCK=true` if you need to disable live database writes temporarily.
- **Database migrations**: run manually from a trusted shell or CI job using the one-off workflow or following [`web/docs/db-ops.md`](web/docs/db-ops.md).
- **Post-deploy verification**: confirm `GET /api/_diag/env` reports the expected base URL and direct database host, and `GET /api/health/db` returns a healthy status.

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
