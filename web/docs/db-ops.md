# Database operations (Neon + Prisma)

This document defines how we run database operations for the web app. The goals are:

- pin Prisma and the application to the same Neon branch/endpoint (pooler for runtime, direct for migrations);
- avoid schema drift between environments by controlling when `prisma migrate` runs;
- guarantee runtime secrets are present while allowing Vercel builds to complete; and
- provide a repeatable playbook for clearing the Prisma P3009 failure caused by the `202409160001_group_enhancements` migration.

## Consistent Neon endpoint policy

Use a single Neon branch/endpoint per environment and point both URLs at that database:

- `DATABASE_URL` should use the **pooler** host so that serverless runtimes reuse connections efficiently.
- `DIRECT_URL` must use the **direct** host (no `-pooler`) for Prisma CLI operations.

Mixing different hosts across deployments can lead to empty databases (new `ep-xxxx` identifiers) or `_prisma_migrations`
divergence. The helper scripts below ensure credentials are URL-encoded and warn if the wrong host type is supplied.

### DATABASE_URL helper scripts

Use the helper scripts to generate URL-encoded credentials for the Neon direct host with `sslmode=require`. Apply the output to
`DIRECT_URL` as-is, and duplicate it to `DATABASE_URL` after swapping the hostname for the `-pooler` variant.

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

On success the scripts export `DATABASE_URL` (direct) in the current shell and print the masked value so that you can verify it
quickly. Copy the value to `DIRECT_URL`, then update the hostname to the `-pooler` variant and store it separately as
`DATABASE_URL` for runtime use.

## Build and deployment policy

- Vercel builds run `pnpm build` with `RUN_MIGRATIONS=1` and `ALLOW_MIGRATE_ON_VERCEL=1` so that migrations execute automatically. Preview builds fall back to `prisma db push --accept-data-loss` when `prisma migrate deploy` fails (Production fails fast).
- When executing migrations manually use a secure environment (local shell with the helper scripts above or a dedicated CI job) where you can confirm the target database and credentials before execution.
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
following. Work through the checklist below **in order** and keep command output as evidence so that you can prove which step
fails.

### 1. Confirm what actually exists in the production database

Use the **same direct host** URL that production relies on (`DIRECT_URL` style, no `-pooler` suffix) and run the following from
your local machine. Replace the sample URL with the real value from Vercel → Production.

```bash
export DIRECT_URL='postgresql://.../neondb?sslmode=require'
psql "$DIRECT_URL" -c "select current_database() as db, current_user as user, current_schema() as schema;"
psql "$DIRECT_URL" -c "select to_regclass('public."User"') as user_tbl, to_regclass('public.users') as users_tbl;"
psql "$DIRECT_URL" -c "\\dt public.*"
```

- `user_tbl` is `NULL` → the `"User"` table was never created (migrations missing or you are on the wrong database).
- Only `users` shows up → the database uses a lowercase table name while Prisma expects `"User"` (see [step 3](#3-map-prisma-to-the-existing-table-names)).

### 2. Apply migrations if the table is missing

Vercel builds execute `prisma migrate deploy` automatically when `RUN_MIGRATIONS=1` and `ALLOW_MIGRATE_ON_VERCEL=1` are set.
Preview deployments fall back to `prisma db push --accept-data-loss` if migrations fail, so brand-new databases can bootstrap
the schema automatically. Confirm both `DATABASE_URL` (pooler) and `DIRECT_URL` (direct) point to the intended database before
executing the commands below.

```bash
export DATABASE_URL='postgresql://...-pooler.../neondb?sslmode=require'
export DIRECT_URL='postgresql://.../neondb?sslmode=require'

pnpm prisma migrate status
pnpm prisma migrate deploy
```

Retry the failing request afterwards. If the `P2021` persists move on to step 3.

### 3. Map Prisma to the existing table names

When Prisma defines `model User { ... }` it queries `"User"` with quotes. Align the schema with the actual table names using
`@@map` for each model (and `@map` on fields if needed). A typical NextAuth schema looks like this:

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

After updating `schema.prisma` run `pnpm prisma generate`. Use `pnpm prisma db pull` if you only need to synchronise with the
existing tables, or `pnpm prisma migrate deploy` to enforce migrations.

### 4. Double-check the runtime connection string

Serverless functions sometimes read a different `DATABASE_URL` than your CLI environment. The repository already includes a guard
in `src/server/db/prisma.ts`: set `LOG_DB_URL_HOST=1` temporarily and Prisma will print the masked host automatically. You can
also add custom logging:

```ts
const url = process.env.DATABASE_URL || "NO_DB_URL";
console.log("[DB_URL_HOST]", url.replace(/:\/\/.*@/, "://***@").split("@")[1]?.split("?")[0] ?? url);
```

If the hostname does not match your expectation, review the Vercel Production/Preview/Development environment variables and team
or project secrets until all instances line up.

Verify that all Vercel environment tabs (Production / Preview / Development) share the same secret and check for project-level or
team-level overrides. Edge runtimes historically did not support pooler hosts—ensure the affected API routes run on the Node.js
runtime.
