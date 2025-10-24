# lab_yoyaku

Lab equipment reservation system monorepo.

## Apps

- `web`: Next.js frontend
- `api`: FastAPI backend

## Development

> **Node / pnpm versions**
>
> The monorepo is pinned to **Node 20.x** and **pnpm 10.18.2**. Use `nvm use` (the repo ships with a `.nvmrc`) followed by
> `corepack enable` / `corepack prepare pnpm@10.18.2 --activate` before running any installs to avoid lockfile drift.

1. Start services
   ```bash
   docker compose -f infra/docker-compose.yml up -d
   ```
2. Run web
   ```bash
   pnpm --filter web dev
   ```
3. Run api
   ```bash
   uvicorn app.main:app --reload --app-dir api
   ```

### Troubleshooting pnpm 403 errors

If dependency installation fails with a `403` status, follow this order of operations:

1. **Confirm registry configuration**
   - `pnpm config get registry` should return `https://registry.npmjs.org/`.
   - Inspect project-level or user-level `.npmrc` files for custom `registry=`, scoped registry entries such as `@*:`, or proxy settings that point to private registries. Comment out or remove incorrect entries.
   - A minimal `.npmrc` with the following content in the project root helps force the correct registry:

     ```ini
     registry=https://registry.npmjs.org/
     strict-ssl=true
     ```

2. **Attempt installation with an explicit registry**
   ```bash
   pnpm -F lab_yoyaku-web add next-auth@^5 @auth/prisma-adapter@^2.5.4 \
     --registry=https://registry.npmjs.org/
   ```

3. **Check for network or certificate issues**
   ```bash
   npm ping --registry=https://registry.npmjs.org/
   pnpm store prune && pnpm store path
   ```

403 responses typically indicate that traffic is being routed to a private registry requiring authentication or is being blocked by a corporate proxy. Ensure requests are sent to the public npm registry before attempting other workarounds.

### Environment
Set `DATABASE_URL` in `web/.env.local` to the **Neon connection pooling URL** (hosted at `*-pooler.neon.tech`) so that Prisma
talks to PgBouncer with SSL enabled, for example:

```
postgresql://USER:PASS@ep-xxxxxx-pooler.neon.tech/neondb?sslmode=require&pgbouncer=true&connect_timeout=15
```

Prisma migrations are applied automatically during `pnpm build`.

### Database operations quick start
See: `web/docs/db-ops.md`

Minimum CI-equivalent checks:

```bash
cd web
# (DATABASE_URL is assumed to be set via the helper scripts)
pnpm run db:migrate:status
pnpm run db:migrate:resolve-rolled
pnpm run db:migrate:deploy
```

#### Vercel deployment checklist

- **Runtime**: Project Settings → General → Node.js Version → `20.x` (mirrors the repo `engines.node`).
- **Environment variables** (set for Production and Preview):
  - `GOOGLE_OAUTH_CLIENT_ID`
  - `GOOGLE_OAUTH_CLIENT_SECRET`
  - `AUTH_SECRET`
  - `AUTH_TRUST_HOST=true` (required when running behind Vercel/production proxies)
  - `AUTH_URL=https://<your-domain>` (also set `NEXTAUTH_URL` to the same origin if required)
  - `DATABASE_URL=postgresql://...-pooler.neon.tech/...?...` (Neon connection pooling URL with `sslmode=require` and
    `pgbouncer=true`)
  - Preview deployments only: `USE_MOCK=true` to bypass live database traffic when troubleshooting
- **Google OAuth**: ensure `https://<your-domain>/api/auth/callback/google` is an authorized redirect URI and `https://<your-domain>` is an authorized JavaScript origin in Google Cloud Console.
- Use Vercel's **Redeploy → Clear build cache** flow (or disable "Use existing Build Cache") when troubleshooting so that Prisma
  migrations and NextAuth chunks are rebuilt from a clean state.
- **Post-deploy verification**: confirm the deployment is wired correctly by querying the diagnostic endpoints:
  - `GET /api/_diag/auth` → `{ "hasGoogleClientId": true, "hasGoogleClientSecret": true, "appBaseUrl": "https://<your-domain>", "authTrustHost": "true", "trustHostEffective": true }`
  - `GET /api/auth/providers` → response includes `google`
  - `GET /api/auth/session` → `{}` when logged out, populated session when signed in
  - `/api/auth/signin/google?callbackUrl=%2Fdashboard` → redirects to the Google consent screen

### DB health check

Run the health endpoint to verify connectivity:

```bash
curl http://localhost:3000/api/health/db
```

In Neon SQL editor you can run:

```sql
select table_schema, table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;
```

## Testing

### Web

Run the linter for the Next.js frontend:

```bash
pnpm --filter ./web lint
```

### API

Execute the FastAPI unit tests:

```bash
cd api
PYTHONPATH=. pytest -q
```
