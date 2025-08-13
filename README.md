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
