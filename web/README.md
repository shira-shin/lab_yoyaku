# Web frontend

## ローカル起動

```bash
pnpm -C web dev
```

ブラウザで <http://localhost:3000> を開きます。

## 環境変数

- `DATABASE_URL` : Prisma が接続する PostgreSQL の接続文字列。
- `USE_MOCK` : `true` の場合は `/api/mock` 配下のモック API を有効化。`false`（デフォルト）の場合は Prisma 経由の本番 API のみを許可します。
- `NEXT_PUBLIC_API_BASE` : クライアント側 fetch が別オリジンの API を叩く場合のベース URL。通常は空で相対パスを使用します。
- `NEXT_PUBLIC_SITE_URL` : サーバー側 fetch のベース URL。指定がなければ Vercel 環境では `https://$VERCEL_URL`、ローカルでは `http://localhost:3000` を用います。
- `AUTH_SECRET` : NextAuth.js で暗号化に使用するランダム文字列。
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` : Google Cloud Console で発行した OAuth 2.0 クライアントのクレデンシャル。

### Google OAuth リダイレクト URI

Google Cloud Console の OAuth 2.0 クライアントには、以下のリダイレクト URI を登録してください。

- ローカル開発: `http://localhost:3000/api/auth/callback/google`
- Vercel (例): `https://<your-vercel-domain>/api/auth/callback/google`

## Tailwind v4 メモ

- `src/app/globals.css` で `@import "tailwindcss";` を使用します。
- `postcss.config.js` は `@tailwindcss/postcss` プラグインのみを読み込みます。
- v4 から `@tailwind base` などは不要です。

## 検証時の注意

- プレビューと本番ではクッキーがホスト単位で分離されます。同じホスト（例: `https://labyoyaku.vercel.app`）に固定してログイン状態を確認してください。
