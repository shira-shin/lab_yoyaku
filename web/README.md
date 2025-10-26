# Web frontend

## Local development

```bash
pnpm -C web dev
```

Visit <http://localhost:3000> once the dev server boots.

## Environment variables

`pnpm build` calls `web/scripts/assert-env.ts` which currently requires `DATABASE_URL`. The helper prints a friendly error if it is missing before running `prisma generate`.

### Database connection

- `DATABASE_URL` — PostgreSQL connection string pointing to the **direct** Neon host with `sslmode=require` and a URL-encoded password.
- Use `./scripts/set-database-url.sh` (macOS/Linux) or `./scripts/set-database-url.ps1` (PowerShell) to compose a safe URL:
  ```bash
  cd web
  ./scripts/set-database-url.sh neondb_owner 'YOUR_REAL_PASSWORD' ep-xxxxx.ap-southeast-1.aws.neon.tech neondb
  ```
  ```powershell
  cd web
  ./scripts/set-database-url.ps1 -User 'neondb_owner' -PasswordRaw 'YOUR_REAL_PASSWORD' -Host 'ep-xxxxx.ap-southeast-1.aws.neon.tech' -DbName 'neondb'
  ```
  The scripts reject `-pooler` hosts and display a masked URL after exporting `DATABASE_URL` in the current shell.

## Neon endpoint (ep-ID) の統一と検証

- `DATABASE_URL` は Neon の **pooler** ホスト、`DIRECT_URL` は **直結** ホストを指す。どちらも **同じ ep-ID** を使うこと。
- ビルド前ガード（`web/scripts/assert-endpoints-match.ts`）が `pnpm build` 実行時に ep-ID をチェックする。不一致の場合は Preview で `PREBUILD_ALLOW_ENDPOINT_MISMATCH=1` を付けると警告ログだけにできる（Production では常に失敗）。
- 本番環境では `GET /api/health/db` を叩くと、接続中の `endpoint` と主要テーブルの有無（null / 非 null）が確認できる。

### テーブル作成（統一先の ep 側）

```bash
vercel env pull --environment production web/.env.vercel
set -a; source web/.env.vercel; set +a
pnpm -C web prisma db push --skip-generate --accept-data-loss --url "$DIRECT_URL"
```

もしくは Neon SQL エディタで [`web/init.sql`](./init.sql) を実行する。

After the push completes, call `/api/health/db` on the production deployment to confirm that the expected tables exist and that the endpoint ID matches the configured environment variables.

If running the command locally is not possible, trigger the "Manual Neon direct push" workflow from GitHub Actions. Configure `NEON_DIRECT_URL` (direct host) and `NEON_DATABASE_URL` (matching pooler host) as repository secrets before launching the workflow; it verifies the endpoint alignment and then executes the same direct `prisma db push` command.

### Application settings

- `APP_BASE_URL` (optional) — canonical origin used when generating email links (defaults to `http://localhost:3000` in development).
- `APP_SESSION_COOKIE_NAME` (optional) — overrides the session cookie name (default: `lab_session`).
- `USE_MOCK` — set to `true` to serve mock API responses during local testing without touching the database.
- `NEXT_PUBLIC_API_BASE` — client-side base URL override for API calls.
- `NEXT_PUBLIC_SITE_URL` — server-side fetch base URL override.
- `NEXT_PUBLIC_APP_TZ` — display timezone (default `Asia/Tokyo`).
- `BCRYPT_ROUNDS` — override the cost factor when generating temporary passwords.

### Build-time migrations

`package.json` keeps the existing gate: `RUN_MIGRATIONS === '1'` triggers `prisma migrate deploy` during `pnpm build`. All other values skip the deploy.

- **Vercel policy:** leave `RUN_MIGRATIONS` unset (or explicitly `0`). Builds will run `prisma generate` only and log `Skipping prisma migrate deploy`.
- **Local/CI:** export `RUN_MIGRATIONS=1` when you intentionally want `pnpm build` to apply migrations:
  ```bash
  cd web
  RUN_MIGRATIONS=1 pnpm build
  ```

For the detailed migration playbook see [`docs/db-ops.md`](./docs/db-ops.md).

## Tailwind v4 notes

- `src/app/globals.css` uses `@import "tailwindcss";`.
- `postcss.config.js` loads the `@tailwindcss/postcss` plugin only.
- Tailwind v4 no longer needs `@tailwind base` declarations.

## Diagnostics

- `/api/_diag/env` summarises the resolved environment (base URL, database host, etc.).
- `/api/health/db` reveals the connected Neon endpoint ID and whether key tables exist.

## Preview checks

When working in preview deployments remember that cookies are isolated per domain. Use the same hostname (for example `https://labyoyaku.vercel.app`) when validating the login flow.
