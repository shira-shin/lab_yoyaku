# Database operations (Neon + Prisma)

This document defines how we run database operations for the web app. The goals are:

- keep Prisma and the application pointed at the Neon **direct** host at all times;
- avoid schema drift between environments by controlling when `prisma migrate` runs;
- guarantee runtime secrets are present while allowing Vercel builds to complete; and
- provide a repeatable playbook for clearing the Prisma P3009 failure caused by the `202409160001_group_enhancements` migration.

## Direct host only policy

Always configure `DATABASE_URL` with the Neon **direct** host (no `-pooler` suffix) and include `sslmode=require`. Mixing pooled
and direct URLs causes `_prisma_migrations` to diverge and leads to P3009 checksum errors because pooled connections bypass the
transactional behaviour Prisma expects. The helper scripts ensure the right format and error when a pooled host is provided.

### DATABASE_URL helper scripts

Use the helper scripts to set an URL-encoded `DATABASE_URL` with a direct host and `sslmode=require`.

#### PowerShell

```powershell
cd web
./scripts/set-database-url.ps1 -User 'neondb_owner' -PasswordRaw 'YOUR_REAL_PASSWORD' -Host 'ep-xxxxx.ap-southeast-1.aws.neon.tech' -DbName 'neondb'
```

#### Bash

```bash
cd web
./scripts/set-database-url.sh neondb_owner 'YOUR_REAL_PASSWORD' ep-xxxxx.ap-southeast-1.aws.neon.tech neondb
```

On success the scripts export `DATABASE_URL` in the current shell and print the masked value so that you can verify it quickly.
They also exit with an error when the host contains `-pooler` to enforce the direct-host rule.

## Build and deployment policy

- Vercel builds run `pnpm build` with `RUN_MIGRATIONS` unset (or explicitly `0`), which means the build only executes `pnpm exec tsx scripts/assert-env.ts`, `prisma generate`, and `next build`. The `prisma migrate deploy` step is skipped automatically while `VERCEL=1`.
- Only run database migrations from a secure environment (local shell with the helper scripts above or a dedicated CI job) where you can confirm the target database and credentials before execution.
- `JWT_SECRET` is mandatory at runtime. The build step on Vercel tolerates a missing value and prints a warning, but production deployments must ensure the secret is configured via Vercel environment variables.

## P3009 recovery playbook (`202409160001_group_enhancements`)

Perform the following steps from your local machine after pointing `DATABASE_URL` at the direct host (examples below). Passwords
must be URL-encoded.

```bash
cd web
# 1) Ensure DATABASE_URL uses the direct host with sslmode=require (see scripts above)
pnpm prisma migrate status

# 2) Mark the failed migration as rolled back so Prisma can retry
pnpm prisma migrate resolve --rolled-back 202409160001_group_enhancements

# 3) Deploy all pending migrations
pnpm prisma migrate deploy
```

If the migration was already applied manually and Prisma cannot re-run it, mark it as applied cautiously after verifying the
schema matches:

```bash
cd web
pnpm prisma migrate resolve --applied 202409160001_group_enhancements
pnpm prisma migrate deploy
```

> **Important:** Only use `--applied` when you have confirmed that the database already reflects the migration changes exactly.

### Verifying the Prisma metadata

Run the following SQL against the database to confirm migration history and ensure no entries remain rolled back or pending:

```sql
SELECT migration_name, started_at, finished_at, rolled_back_at
FROM _prisma_migrations
ORDER BY started_at DESC;
```

Pending or rolled-back migrations must be investigated before considering the database healthy.
