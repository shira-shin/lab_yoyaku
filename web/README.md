# Web frontend

## ローカル起動

```bash
pnpm -C web dev
```

ブラウザで <http://localhost:3000> を開きます。

## 環境変数

- `NEXT_PUBLIC_API_BASE` : クライアント側 fetch が別オリジンの API を叩く場合のベース URL。通常は空で相対パスを使用します。
- `NEXT_PUBLIC_SITE_URL` : サーバー側 fetch のベース URL。指定がなければ Vercel 環境では `https://$VERCEL_URL`、ローカルでは `http://localhost:3000` を用います。

## Tailwind v4 メモ

- `src/app/globals.css` で `@import "tailwindcss";` を使用します。
- `postcss.config.js` は `@tailwindcss/postcss` プラグインのみを読み込みます。
- v4 から `@tailwind base` などは不要です。
