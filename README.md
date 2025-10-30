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

### Lockfile maintenance

To reproduce the Vercel lockfile error locally and refresh the workspace metadata, run the following commands from the repo root:

```bash
corepack prepare pnpm@10.18.2 --activate
pnpm install --lockfile-only
git add pnpm-lock.yaml
```

Commit the regenerated lockfile (e.g., `git commit -m "chore(pnpm): regenerate lockfile to include tsx@workspace:*"`) so `pnpm install --frozen-lockfile` succeeds in CI. Keep `pnpm-workspace.yaml` listing `web`, `tools/*`, and `packages/*` to resolve `tools/tsx-shim` as the workspace implementation of `tsx`.

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

`pnpm build` runs `prisma migrate deploy` when `RUN_MIGRATIONS=1`. On Vercel the step is skipped unless you also opt-in with `ALLOW_MIGRATE_ON_VERCEL=1`. Preview builds fall back to `prisma db push --accept-data-loss` if `migrate deploy` fails so that empty databases can be bootstrapped automatically.

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
1. Ensure Vercel env (Production + Preview):
   - `DATABASE_URL` — Neon **pooler** URL (fixed endpoint, URL-encoded password).
   - `DIRECT_URL`   — Same database via the **direct** host (no `-pooler`).
   - `RUN_MIGRATIONS=1`
   - `ALLOW_MIGRATE_ON_VERCEL=1`
   - Optional preview safety net: `ALLOW_RUNTIME_BOOTSTRAP=1` to let the API run `prisma db push --accept-data-loss` exactly once if the tables are still missing during the first request.
2. Redeploy the site. The build will run `prisma migrate deploy` (and `prisma db push --accept-data-loss` as a preview-only fallback).
3. Open `/api/health/db` to confirm the tables exist, then sign in and test the UI.

### DB bootstrap (empty DB -> create tables)
- 初回起動や空DBで `P2021: public."User" does not exist` が出る場合：
  1. Vercel プロジェクトの Preview / Production すべてに同じ `DATABASE_URL`（pooler）と `DIRECT_URL`（direct）を設定し、エンドポイントが固定されていることを確認する（デプロイごとに `ep-xxxx` が変わらないようにする）。
  2. `RUN_MIGRATIONS=1` と `ALLOW_MIGRATE_ON_VERCEL=1` を設定して再デプロイする。
     - Preview 環境では、`prisma migrate deploy` に失敗した場合に自動で `prisma db push --accept-data-loss` を実行してテーブルを作成する。
     - 追加の保険として Preview 環境で `ALLOW_RUNTIME_BOOTSTRAP=1` を指定すると、初回リクエストでテーブルが見つからない場合に 1 度だけ `prisma db push --accept-data-loss` を実行する。
  3. `/api/health/db` で主要テーブルが存在することを確認する。

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

- すべての環境で同一の Neon エンドポイントを使用する。`DATABASE_URL`（pooler）と `DIRECT_URL`（direct）は同じ DB/branch を指す URL を設定し、`ep-xxxx` が毎回変わらないようにする。
- Vercel で自動的にマイグレーションを実行したい場合は `RUN_MIGRATIONS=1` と `ALLOW_MIGRATE_ON_VERCEL=1` を設定する。
  - Preview 環境は `prisma migrate deploy` に失敗した場合 `prisma db push --accept-data-loss` にフォールバックする。
  - Production 環境はフォールバックせず、失敗した場合はデプロイを失敗として扱う。
- 手動実行する場合は引き続き GitHub Actions の one-off ワークフローやローカル CLI から `pnpm prisma migrate deploy` を実行できる。

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
  - `RUN_MIGRATIONS=1`
  - `ALLOW_MIGRATE_ON_VERCEL=1`
  - `APP_URL` — canonical origin used in emails and server-side fetches (e.g. `https://<your-domain>`). Set to `https://labyoyaku.vercel.app` for both Production and Preview.
  - `NEXT_PUBLIC_APP_URL` — same origin exposed to the client bundle. Set to `https://labyoyaku.vercel.app` for both Production and Preview.
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
