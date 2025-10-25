#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

# 0) Vercel の本番 env を pull（VERCEL_TOKEN がリポジトリ/ワークフローの secret にある前提）
if ! command -v vercel >/dev/null 2>&1; then npm i -g vercel@latest >/dev/null 2>&1; fi
vercel env pull --environment production --yes --token "${VERCEL_TOKEN:?VERCEL_TOKEN missing}" .env.from-vercel
set -a; source .env.from-vercel; set +a

# 必須 env の確認（すべて Vercel 側に置く）
: "${DIRECT_URL:?missing}"
: "${NEON_PROJECT_ID:?missing}"
: "${NEON_DATA_API_KEY:?missing}"

# Neon Data API の endpoint を推定
endpoint_host="$(printf '%s' "$DIRECT_URL" | awk -F[@/?] '{print $2}')"
endpoint_id="$(printf '%s' "$endpoint_host" | sed -E 's/\..*$//')"
database="$(printf '%s' "$DIRECT_URL" | awk -F'[/?]' '{print $4}')"
api="https://console.neon.tech/api/v2/projects/${NEON_PROJECT_ID}/branches/main/endpoints/${endpoint_id}/sql"

echo "[info] endpoint=$endpoint_id db=$database"

# 1) 欠けがちなモデルを部分スキーマ化（必要なら下の正規表現に足す）
models='GroupMember|Reservation|PasswordResetToken'
part=prisma/partial.prisma
awk -v models="$models" '
  BEGIN{blk=0; keep=0}
  /^generator[[:space:]]+/ || /^datasource[[:space:]]+/ { blk=1 }
  blk==1 { print; if ($0 ~ /^}/) blk=0; next }
  /^model[[:space:]]+/ { name=$2; keep=(name ~ ("^(" models ")$")) ? 1 : 0 }
  { if (keep) print }
' prisma/schema.prisma > "$part"

# 2) 空→部分スキーマの差分 SQL を作成
pnpm prisma migrate diff --from-empty --to-schema-datamodel "$part" --script > add-missing.sql

# 3) SQL を Neon Data API で適用
if rg -n --pcre2 'CREATE TABLE|ALTER TABLE' add-missing.sql >/dev/null; then
  q=$(tr '\n' ' ' < add-missing.sql | sed 's/"/\"/g')
  curl -fsS "$api" -H "Authorization: Bearer ${NEON_DATA_API_KEY}" -H "Content-Type: application/json" -d "{"query":"$q","database":"${database}"}"
  echo "[ok] SQL applied."
else
  echo "[ok] 差分なし（作成・変更は不要）"
fi

# 4) 検証
verify=$(cat <<'SQL'
select to_regclass('public."GroupMember"')  as group_member_tbl,
       to_regclass('public."Reservation"')  as reservation_tbl,
       to_regclass('public."PasswordResetToken"') as prt_tbl;
SQL
)
vq=$(printf "%s" "$verify" | tr '\n' ' ' | sed 's/"/\"/g')
curl -fsS "$api" -H "Authorization: Bearer ${NEON_DATA_API_KEY}" -H "Content-Type: application/json" -d "{"query":"$vq","database":"${database}"}" | tee /tmp/verify.json

if grep -q '"null"' /tmp/verify.json; then
  echo "[warn] まだ NULL が残っています。model 名または @@map を確認してください。"
  exit 1
fi
echo "[ok] 必要テーブルの存在を確認しました。"
