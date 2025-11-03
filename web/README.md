# Web frontend

## Local development

```bash
pnpm -C web dev
```

Visit <http://localhost:3000> once the dev server boots.

## Environment variables

`pnpm build` calls `web/scripts/assert-env.ts` which currently requires `DATABASE_URL`. The helper prints a friendly error if it is missing before running `prisma generate`.

### Database connection

- `DATABASE_URL` — PostgreSQL connection string pointing to the **pooler** host (example: `ep-xxxxx-pooler.ap-*.neon.tech`).
- `DIRECT_URL` — PostgreSQL connection string pointing to the **direct** host (example: `ep-xxxxx.ap-*.neon.tech`).
- 双方とも **同じ ep-ID** を用いること。Production だけでなく Preview/Development でも ID が揃っていると、接続先のテーブル状態を一貫して追跡できる。
- Local での接続文字列作成には `./scripts/set-database-url.sh` (macOS/Linux) または `./scripts/set-database-url.ps1` (PowerShell) を使うと安全に URL が組み立てられる。スクリプトは直結ホスト向けなので、実行後に得られた URL を `DIRECT_URL` として保存し、同じ ep-ID に `-pooler` を付与したホスト名へ書き換えたものを `DATABASE_URL` として記録する（例: `ep-bitter-leaf-a1bq8tp9` → `ep-bitter-leaf-a1bq8tp9-pooler`）。

## Neon endpoint (ep-ID) の統一と検証

- `web/scripts/assert-endpoints-match.ts` が `pnpm build` 中に `DATABASE_URL` と `DIRECT_URL` の ep-ID を比較する。Production では不一致で即失敗し、Preview/Development では警告を出してビルドを継続する（ログに詳細な診断情報を残す）。
- ランタイムの Prisma クライアントは常に `DIRECT_URL` を使用するため、Preview/Development の警告は「pooler と direct のズレを検知したが、runtime は direct を参照するので安全に無視する」という意味になる。
- `PREBUILD_EXPECT_EP` を指定すると、両方の URL が特定の ep-ID を指しているかどうかを追加チェックできる。Production では不一致時に fail-fast、非本番では警告となる。
- `/api/health/db` にアクセスすると、接続中の `endpoint` と主要テーブル（`User` / `GroupMember` / `Reservation` / `PasswordResetToken`）の存在可否を JSON で確認できる。

### Vercel 環境の設定フロー

1. Vercel ダッシュボードの **Project Settings → Environment Variables** を開き、Production / Preview / Development すべてのスコープで `DATABASE_URL`（pooler ホスト）と `DIRECT_URL`（直結ホスト）が同じ ep-ID を指していることを確認する。
2. Env Group を使っている場合は Group 側の値も同じ組み合わせに更新し、ブランチ固有の ENV があれば削除または統一する。
3. 値を変更したら再デプロイし、Preview でも Production でも `/api/health/db` の `info.endpoint` が期待どおりになっているか確認する。

> **Note**
> 本変更前に発行されたパスワードリセットメールは旧来の DATABASE_URL 側にトークンが保存されているため無効になる。DIRECT_URL へ揃えた後に再送したメールから正常に動作する。

### テーブル作成（統一先の ep 側）

```bash
vercel env pull --environment production web/.env.vercel
set -a; source web/.env.vercel; set +a
pnpm -C web prisma db push --skip-generate --accept-data-loss --url "$DIRECT_URL"
```

もしくは Neon SQL エディタで [`web/init.sql`](./init.sql) を実行する。

テーブルが一部 `null` のままの場合は、同じ ep-ID を指す ENV を再確認し、`prisma db push` か `init.sql` を適用して不足分を作成する。Preview でテーブルが欠けている間は API が 200/空配列で応答するため画面は落ちないが、根本対応としてテーブルを整備すること。

After the push completes, call `/api/health/db` on the production deployment to confirm that the expected tables exist and that the endpoint ID matches the configured environment variables.

If running the command locally is not possible, trigger the "Manual Neon direct push" workflow from GitHub Actions. Configure `NEON_DIRECT_URL` (direct host) and `NEON_DATABASE_URL` (matching pooler host) as repository secrets before launching the workflow; it verifies the endpoint alignment and then executes the same direct `prisma db push` command.

### Application settings

- `APP_URL` — canonical origin used when generating email links and performing server-side fetches. **Set to `https://labyoyaku.vercel.app` in Vercel Production/Preview.**
- `NEXT_PUBLIC_APP_URL` — same origin exposed to client-side code. **Set to `https://labyoyaku.vercel.app` in Vercel Production/Preview.**
- `APP_BASE_URL` (legacy fallback) — older name kept for backward compatibility; prefer `APP_URL` moving forward.
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
