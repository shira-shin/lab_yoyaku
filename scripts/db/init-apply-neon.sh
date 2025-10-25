#!/usr/bin/env bash
set -euo pipefail

# Resolve repository root from this script location and move into web workspace.
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT_DIR}/web"

# Ensure required Vercel credentials are provided for pulling environment variables.
: "${VERCEL_TOKEN:?VERCEL_TOKEN is required}"
: "${VERCEL_ORG_ID:?VERCEL_ORG_ID is required}"
: "${VERCEL_PROJECT_ID:?VERCEL_PROJECT_ID is required}"

ENV_FILE=".env.from-vercel"

# Install Vercel CLI if it is not already available.
if ! command -v vercel >/dev/null 2>&1; then
  echo "[info] installing vercel CLI via npm"
  npm i -g vercel@latest
fi

# Pull production environment variables from Vercel.
vercel env pull --environment production --token "${VERCEL_TOKEN}" --yes "${ENV_FILE}"

# Load pulled environment variables.
set -a
source "${ENV_FILE}"
set +a

: "${DIRECT_URL:?DIRECT_URL missing in Vercel env}"
: "${DATABASE_URL:?DATABASE_URL missing in Vercel env}"
: "${NEON_PROJECT_ID:?NEON_PROJECT_ID missing in Vercel env}"
: "${NEON_DATA_API_KEY:?NEON_DATA_API_KEY missing in Vercel env}"

endpoint_host="$(printf '%s' "${DIRECT_URL}" | awk -F[@/?] '{print $2}')"
NEON_ENDPOINT_ID="$(printf '%s' "${endpoint_host}" | sed -E 's/\..*$//')"
NEON_DATABASE="$(printf '%s' "${DIRECT_URL}" | awk -F'[/?]' '{print $4}')"

mask(){ sed -E 's#://[^@]+@#://***@#'; }

echo "[info] endpoint=${NEON_ENDPOINT_ID} db=${NEON_DATABASE} project=${NEON_PROJECT_ID}"
echo "[info] DIRECT_URL=$(echo "${DIRECT_URL}" | mask)"
echo "[info] DATABASE_URL=$(echo "${DATABASE_URL}" | mask)"

# Regenerate init.sql from Prisma schema.
pnpm prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > init.sql

# Ensure the generated SQL appears complete.
if ! tail -n 50 init.sql | grep -Eq '\);|END;|END\s*\$\$;'; then
  echo "[fail] init.sql may be truncated" >&2
  exit 1
fi
echo "[ok] init.sql regenerated."

API="https://console.neon.tech/api/v2/projects/${NEON_PROJECT_ID}/branches/main/endpoints/${NEON_ENDPOINT_ID}/sql"
Q="$(tr '\n' ' ' < init.sql | sed 's/"/\\"/g')"

# Apply SQL via Neon Data API.
curl -fsS "${API}" \
  -H "Authorization: Bearer ${NEON_DATA_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"${Q}\",\"database\":\"${NEON_DATABASE}\"}"

echo "[ok] init.sql applied via Neon Data API."

VERIFY=$(cat <<'SQL'
select to_regclass('public."User"') as user_tbl,
       to_regclass('public."Account"') as account_tbl,
       to_regclass('public."Session"') as session_tbl,
       to_regclass('public."VerificationToken"') as vt_tbl;
SQL
)

VQ="$(printf '%s' "${VERIFY}" | tr '\n' ' ' | sed 's/"/\\"/g')"

curl -fsS "${API}" \
  -H "Authorization: Bearer ${NEON_DATA_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"${VQ}\",\"database\":\"${NEON_DATABASE}\"}" | tee /tmp/neon_verify.json

if grep -q '"user_tbl":null\|"account_tbl":null\|"session_tbl":null\|"vt_tbl":null' /tmp/neon_verify.json; then
  echo "[fail] Required tables missing. See /tmp/neon_verify.json" >&2
  exit 1
fi

echo "[ok] All required tables exist."
