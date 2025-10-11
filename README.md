# lab_yoyaku

Lab equipment reservation system monorepo.

## Apps

- `web`: Next.js frontend
- `api`: FastAPI backend

## Development

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
Set `DATABASE_URL` in `web/.env.local` to point to your Neon (Postgres) instance.
Prisma migrations are applied automatically during `pnpm build`.

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
