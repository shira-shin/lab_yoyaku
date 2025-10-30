# Auth Debugging Plan

## 現状の問題と原因
- `web/src/app/api/debug/auth-state/route.ts` などが `@/lib/prisma` を import するようになったが、Next.js の `collecting page data ...` のタイミングで Prisma Client が未生成のままだった。
- 本番ビルドのログには `@prisma/client did not initialize yet. Please run "prisma generate" ...` が出ており、Prisma Client の生成が抜けているのが原因。
- これまでのビルドでは `pnpm --workspace-root run migrate:deploy` 内で `prisma generate` まで走っていたが、P3009/P3018 を避けるために migrate 呼び出しを外した結果、generate も一緒に外れてしまった。
- 対策として「migrate なしで generate だけを実行する」ステップをビルドに追加する。

## 追加するビルド前処理
- リポジトリルートの `package.json` に Prisma Client 生成専用のスクリプトを追加する。

  ```json
  {
    "scripts": {
      "prisma:gen:web": "cd web && prisma generate --schema=./prisma/schema.prisma",
      "migrate:deploy": "node scripts/migrate-deploy.cjs"
    }
  }
  ```

- `web/package.json` の `build` スクリプトを以下の順序に変更する。

  ```json
  {
    "scripts": {
      "build": "pnpm run prebuild:guard && node -e \"const {execSync}=require('node:child_process'); const run=c=>execSync(c,{stdio:'inherit',shell:true}); run('pnpm exec tsx scripts/assert-env.ts'); run('pnpm --workspace-root run prisma:gen:web'); run('next build');\""
    }
  }
  ```

- これで `assert-env.ts` → Prisma Client 生成 (`web/prisma/schema.prisma`) → `next build` の順になる。`migrate` はここでは呼ばない。

## Temporary debug endpoint
- Add `web/src/app/api/debug/auth-state/route.ts` that returns core user info (id/email/normalizedEmail/passwordHashLength/createdAt/updatedAt) and runtime env details (APP_URL/NEXT_PUBLIC_APP_URL/VERCEL_URL).
- Guard it with a token query parameter (`token=`) that must match `process.env.AUTH_DEBUG_TOKEN`. Return `500` if the env var is missing and `403` if the token mismatches. Never log or expose the raw password hash length other than length.

## Auth/login logging
- Update `web/src/app/api/auth/login/route.ts` to log:
  - The runtime base URL from the new helper.
  - The submitted email and normalized email.
  - Whether the user lookup failed, the password hash is missing, or the password comparison failed.
- Keep the existing Prisma error handling / password rehash logic intact.

## Base URL helperと環境変数
- `web/src/lib/get-base-url.ts` は `AUTH_BASE_URL` → `APP_URL` → `NEXT_PUBLIC_APP_URL` → `VERCEL_URL`（`https://` 付与）→ `http://localhost:3000` の優先順位にする。`VERCEL_URL` にフォールバックするのは preview URL が混ざるときのみ。
- Vercel Project の環境変数に最低でも次を入れておくこと。
  - `AUTH_BASE_URL=https://labyoyaku.vercel.app`
  - `AUTH_DEBUG_TOKEN=<十分に長いランダム文字列>`
- `/api/auth/forgot-password`、`/api/cookies/delete`、`/api/auth/reset-password`、サーバー側で fetch している箇所はすべてこの helper を経由させる。`/api/cookies/delete` を直書きしている箇所が 1 行でも残らないようにする。

## Bootstrap admin
- Create `web/scripts/ensure-admin.ts` to upsert a bootstrap user using `AUTH_BOOTSTRAP_EMAIL` and `AUTH_BOOTSTRAP_PASSWORD` (hashed with bcryptjs). Skip work when env vars are missing. Update `scripts/migrate-deploy.cjs` to run this script right after `prisma migrate deploy` (after migrations succeed).

## Forgot password response
- When there is no mail provider configured (`SMTP_HOST`/`RESEND_API_KEY` etc.), have `/api/auth/forgot-password` respond with `{ ok: true, resetUrl, note }` instead of only logging the URL. Continue logging for visibility.
- Update `.env.example` with the required mail provider env vars and the new auth-specific env vars (`AUTH_BASE_URL`, `AUTH_BOOTSTRAP_EMAIL`, `AUTH_BOOTSTRAP_PASSWORD`).

## Cookie deletion fetches
- Audit all places calling `/api/cookies/delete` on the server and ensure they use the shared helper. If the fetch still fails (e.g. 401) log a warning but let the outer request succeed.

## Prisma Client 共有
- `web/src/lib/prisma.ts` が存在しない場合は追加し、下記の実装で「開発時は global 再利用、本番は 1 インスタンス」で統一する。PrismaClient は `pnpm --workspace-root run prisma:gen:web` が生成することを前提とする。

  ```ts
  import { PrismaClient } from "@prisma/client";

  const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

  export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
      log: ["error", "warn"],
    });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
  }
  ```

- `@/server/db/prisma` からも同じインスタンスを再輸出し、既存のサーバーサイドコードはそのまま利用できるようにする。

## Post-deploy verification
Include these manual checks in the PR description:
1. Hit `/api/debug/auth-state?token=...` and verify env values and the user list (normalizedEmail populated, passwordHashLength > 0).
2. Use the same credentials against `/api/auth/login` and expect 200.
3. Call `/api/auth/forgot-password` and verify the JSON contains `https://labyoyaku.vercel.app/reset-password?...`.
4. Confirm page loads do **not** log `/api/cookies/delete 401` anymore.

## デプロイ後の観測ポイント
- `https://labyoyaku.vercel.app/api/debug/auth-state?token=<AUTH_DEBUG_TOKEN>` を開き、最低 1 件ユーザーが取得できるか確認する。取得できない場合は `scripts/ensure-admin.ts` を `prisma migrate deploy` の後で呼ぶようにする。
- ユーザーが取得できているのにログインが 401 の場合は、Vercel ログに `[auth/login] password mismatch` などのログが出ているか確認する。ログの段階を見ればどこで失敗したか切り分けできる。

## なぜこうなったのか
- 以前は `pnpm --workspace-root run migrate:deploy` のフロー内で Prisma Client を生成していた。
- P3009/P3018 を避けるために `migrate` 呼び出しをビルドから取り除いた際、Prisma Client の生成ステップも一緒に消えていた。
- その状態で API ルートやサーバーコンポーネントが `@/lib/prisma` を import すると、`@prisma/client did not initialize yet` エラーでビルドが落ちる。
- 生成だけを追加で実行することで、migrate なしでも Prisma Client を確実に用意できる。
