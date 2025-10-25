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

## Diagnosing Prisma P2021 (`public.User` missing)

When authentication fails with a Prisma `P2021` error complaining that `public.User` does not exist, the root cause is one of the
following. Execute the steps in order to identify the mismatch quickly.

### A. Confirm the actual database target

Use the same `DATABASE_URL` as production (pooler or direct are both acceptable for this check) and run the following commands.
Replace the sample URL with the real value from Vercel → Production.

```bash
export DATABASE_URL="postgresql://...-pooler....neon.tech/neondb?sslmode=require"
psql "$DATABASE_URL" -c "select current_database() as db, current_user as user, current_schema() as schema, inet_server_addr() as addr;"
psql "$DATABASE_URL" -c "\\dt public.*"
psql "$DATABASE_URL" -c "select table_name from information_schema.tables where table_schema='public' and lower(table_name) in ('user','users','account','session');"
```

- No results at all → the database is empty (migrations were never applied) or you are pointing at the wrong database.
- `users` exists but `"User"` does not → the Prisma schema is looking for the wrong table name (see [C.](#c-users-exists-but-user-does-not)).

### B. Apply migrations if the database is empty

Run migrations against the production database after exporting both `DATABASE_URL` and `DIRECT_URL` explicitly so Prisma connects
directly for schema operations.

```bash
export DATABASE_URL="postgresql://...-pooler.../neondb?sslmode=require"
export DIRECT_URL="postgresql://.../neondb?sslmode=require"

pnpm prisma migrate status
pnpm prisma migrate deploy
```

If the migration deployment fails, capture and share the full logs. Remember that Vercel skips `prisma migrate deploy` on this
project, so a brand-new database stays empty until you run the command manually.

### C. `users` exists but `"User"` does not

Prisma queries `"User"` when the model name is capitalised. Align the Prisma models with the actual table names using `@@map` for
the model and `@map` for individual fields when necessary. NextAuth-style schemas typically map the models as follows:

```prisma
model User {
  // ...
  @@map("users")
}

model Account {
  // ...
  @@map("accounts")
}

model Session {
  // ...
  @@map("sessions")
}

model VerificationToken {
  // ...
  @@map("verification_tokens")
}
```

Point Prisma at whichever table name truly exists (`users` vs `"User"`)—the safest approach is to adapt the schema to the database
you confirmed in step A.

After changing the schema run `pnpm prisma generate` followed by `pnpm prisma migrate deploy` or `pnpm prisma db push`, depending
on your workflow.

### D. Ensure the runtime uses the expected URL

Serverless functions sometimes read a different `DATABASE_URL` than the build step. Temporarily log the runtime value at the top of
`src/server/db/prisma.ts` (a helper is available in this repository; see below) or print the hostname manually:

```ts
const url = process.env.DATABASE_URL || "NO_DB_URL";
console.log("[DB_URL_HOST] ", url.replace(/:\/\/.*@/, "://***@").split("@")[1].split("?")[0]);
```

Verify that all Vercel environment tabs (Production / Preview / Development) share the same secret and check for project-level or
team-level overrides. Edge runtimes historically did not support pooler hosts—ensure the affected API routes run on the Node.js
runtime.
