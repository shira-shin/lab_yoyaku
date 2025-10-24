## Summary
- [ ] Vercel の DATABASE_URL は Direct + `sslmode=require`（パスワードは URL エンコード済み）
- [ ] Vercel の RUN_MIGRATIONS は 未設定 / `0`
- [ ] ローカルで `pnpm prisma migrate resolve --rolled-back 202409160001_group_enhancements` → `pnpm prisma migrate deploy` が成功
- [ ] NextAuth 由来の依存・型・モデル参照なし
- [ ] User 作成系で `passwordHash` が必ず設定される
- [ ] `pnpm build` が安定完走（`prisma generate` OK／`prisma migrate deploy` はスキップ）

<!-- 追加のメモやスクリーンショットがあればここに記載してください -->
