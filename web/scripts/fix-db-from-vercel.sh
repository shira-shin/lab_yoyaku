#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

# 0) Vercel 本番 env を pull（VERCEL_TOKEN が必要：CI/Secrets から供給）
if ! command -v vercel >/dev/null 2>&1; then npm i -g vercel@latest >/dev/null 2>&1; fi
vercel env pull --environment production --yes --token "${VERCEL_TOKEN:?VERCEL_TOKEN missing}" .env.from-vercel
set -a; source .env.from-vercel; set +a

# 1) 必須 env
: "${DIRECT_URL:?missing DIRECT_URL}"
: "${DATABASE_URL:?missing DATABASE_URL}"
: "${NEON_PROJECT_ID:?missing NEON_PROJECT_ID}"
: "${NEON_DATA_API_KEY:?missing NEON_DATA_API_KEY}"

# 2) pooler と直結の ep 一致チェック（誤接続の早期検知）
db_host="$(node -e 'console.log(new URL(process.env.DATABASE_URL).hostname)')"
di_host="$(node -e 'console.log(new URL(process.env.DIRECT_URL).hostname)')"
get_id() { echo "$1" | sed -E 's/^(ep-[a-z0-9-]+)(-pooler)?\..*$/\1/i'; }
[ "$(get_id "$db_host")" = "$(get_id "$di_host")" ] || { echo "[err] endpoint mismatch: $db_host vs $di_host"; exit 1; }

# 3) 実 DB と schema の差分 SQL を出力（from-url）
mkdir -p .tmp
pnpm prisma migrate diff \
  --from-url "$DIRECT_URL" \
  --to-schema-datamodel prisma/schema.prisma \
  --script > .tmp/fix.sql

# 4) Neon Data API で適用
endpoint_host="$(node -e 'console.log(new URL(process.env.DIRECT_URL).hostname)')"
endpoint_id="${endpoint_host%%.*}"
database="$(node -e 'console.log(new URL(process.env.DIRECT_URL).pathname.slice(1).split("/")[0])')"
api="https://console.neon.tech/api/v2/projects/${NEON_PROJECT_ID}/branches/main/endpoints/${endpoint_id}/sql"

if rg -n --pcre2 'CREATE TABLE|ALTER TABLE|CREATE INDEX|DROP ' .tmp/fix.sql >/dev/null; then
  q="$(tr '\n' ' ' < .tmp/fix.sql | sed 's/"/\\"/g')"
  curl -fsS "$api" -H "Authorization: Bearer ${NEON_DATA_API_KEY}" \
       -H "Content-Type: application/json" \
       -d "{\"query\":\"$q\",\"database\":\"${database}\"}"
  echo "[ok] applied diff to ${endpoint_id}/${database}"
else
  echo "[ok] 差分なし（スキップ）"
fi

# 5) 必要テーブルの存在検証（引用つき名で）
read -r -d '' VERIFY <<'SQL' || true
select
  to_regclass('public."User"')                    as user_tbl,
  to_regclass('public."GroupMember"')             as group_member_tbl,
  to_regclass('public."Reservation"')             as reservation_tbl,
  to_regclass('public."PasswordResetToken"')      as prt_tbl;
SQL
vq="$(printf '%s' "$VERIFY" | tr '\n' ' ' | sed 's/"/\\"/g')"
curl -fsS "$api" -H "Authorization: Bearer ${NEON_DATA_API_KEY}" \
     -H "Content-Type: application/json" \
     -d "{\"query\":\"$vq\",\"database\":\"${database}\"}" | tee .tmp/verify.json

if grep -q '"null"' .tmp/verify.json; then
  echo "[warn] まだ NULL のテーブルがあります。model 名と @@map/@@schema（引用有無）を確認してください。"
  exit 1
fi

echo "[ok] 全テーブル確認できました。"
