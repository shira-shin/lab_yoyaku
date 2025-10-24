# DB Ops (Neon + Prisma)

## 1) DATABASE_URL を安全に設定
### PowerShell
```powershell
cd web
.\scripts\set-database-url.ps1 -User 'neondb_owner' -PasswordRaw 'YOUR_REAL_PASSWORD' -Host 'ep-xxxxx.ap-southeast-1.aws.neon.tech' -DbName 'neondb'
pnpm run db:print-url   # パスワードは伏せられて出ます
```

### Bash
```bash
cd web
./scripts/set-database-url.sh neondb_owner 'YOUR_REAL_PASSWORD' ep-xxxxx.ap-southeast-1.aws.neon.tech neondb
pnpm run db:print-url
```

Host は Direct を使う（-pooler なし）。パスワードに @:/?& 等があっても自動でエンコードされます。

## 2) 失敗 migration (P3009) の解消
```bash
pnpm run db:migrate:status
pnpm run db:migrate:resolve-rolled
pnpm run db:migrate:deploy
```

## 3) トラブルシュート

- **P1013** → DATABASE_URL が壊れている。上のスクリプトで再設定。
- **P3009** → resolve-rolled で失敗印を rolled-back にしてから deploy。
