# Database operations (Neon + Prisma)

This project keeps Prisma in **direct** connection mode against Neon. Direct hosts are required so that `_prisma_migrations` is always updated by the same connection type. Mixing direct and pooled connections leads to P3009 / checksum mismatches because the pooler short-circuits transactional DDL.

## DATABASE_URL helper scripts

Use the helper scripts to set an URL-encoded `DATABASE_URL` with a direct host and `sslmode=require`.

### PowerShell

```powershell
cd web
./scripts/set-database-url.ps1 -User 'neondb_owner' -PasswordRaw 'YOUR_REAL_PASSWORD' -Host 'ep-xxxxx.ap-southeast-1.aws.neon.tech' -DbName 'neondb'
```

### Bash

```bash
cd web
./scripts/set-database-url.sh neondb_owner 'YOUR_REAL_PASSWORD' ep-xxxxx.ap-southeast-1.aws.neon.tech neondb
```

The scripts exit with an error if the host contains `-pooler`. On success they export `DATABASE_URL` in the current shell and print the masked value so that you can verify it quickly.

## Migration runbook (P3009 safe recovery)

Always check the status first, then resolve any rolled-back entries before deploying:

```bash
cd web
pnpm prisma migrate status
pnpm prisma migrate resolve --rolled-back 202409160001_group_enhancements
pnpm prisma migrate deploy
```

If the schema was applied manually and Prisma cannot re-run the migration, mark it as applied cautiously:

```bash
cd web
pnpm prisma migrate resolve --applied 202409160001_group_enhancements
pnpm prisma migrate deploy
```

> **Note:** Only use `--applied` when you have confirmed the database already reflects the migration changes exactly. Otherwise, adjust the SQL so that Prisma can deploy it safely.

## Operational policy

- Vercel builds run `pnpm build` with `RUN_MIGRATIONS` unset (or `0`). The build only runs `prisma generate` and **skips** `prisma migrate deploy`.
- Apply migrations manually from a secure environment (local shell with the scripts above, or a dedicated CI job).
- `DATABASE_URL` must always point at the Neon **direct** host with `sslmode=require` and the password URL-encoded.
- Use `pnpm prisma migrate status` regularly to confirm that `_prisma_migrations` has no pending or failed entries.
