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
