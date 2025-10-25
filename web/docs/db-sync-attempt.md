# DB Sync Attempt (Current Environment)

The automated database synchronization script could not be executed because the required Vercel and Neon credentials are absent from the current execution environment.

- `VERCEL_TOKEN`
- `NEON_PROJECT_ID`
- `NEON_DATA_API_KEY`

Without these environment variables the following command fails before any Prisma diff or Neon Data API call can run:

```bash
pnpm dlx vercel@latest env pull --environment production --token "$VERCEL_TOKEN" --yes .env.from-vercel
```

Once the credentials are supplied, rerun the script from the repository root:

```bash
cd web
pnpm dlx vercel@latest env pull --environment production --token "$VERCEL_TOKEN" --yes .env.from-vercel
source .env.from-vercel
pnpm prisma migrate diff --from-url "$DIRECT_URL" --to-schema-datamodel prisma/schema.prisma --script > patch.sql
# Apply the patch via Neon Data API as described in the runbook
```
