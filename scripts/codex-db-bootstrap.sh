#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../web"

# === ENV（channel_binding は絶対つけない）
export DATABASE_URL="${DATABASE_URL:?missing}"
export DIRECT_URL="${DIRECT_URL:?missing}"

mask(){ sed -E 's#://[^@]+@#://***@#'; }
echo "DATABASE_URL => $(echo "$DATABASE_URL" | mask | awk -F'@' '{print $2}' | cut -d'?' -f1)"
echo "DIRECT_URL   => $(echo "$DIRECT_URL"   | mask | awk -F'@' '{print $2}' | cut -d'?' -f1)"

# まず接続確認（失敗したら SQL 生成→終了コード0で返す）
if ! pnpm -s prisma db execute --url "$DIRECT_URL" --command "select 1;" ; then
  echo "[info] cannot reach DB from here. generating init.sql instead..."
  pnpm -s prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > init.sql
  echo "[next] upload web/init.sql to Neon SQL Editor or call Data API to apply it."
  exit 0
fi

# 到達できるなら、migrate or db push
if pnpm -s prisma migrate status 2>&1 | grep -q "not yet been applied"; then
  pnpm -s prisma migrate deploy
else
  pnpm -s prisma db push
fi

# 検証
pnpm -s prisma db execute --url "$DIRECT_URL" --command \
"select to_regclass('public.\"User\"') user_tbl, to_regclass('public.users') users_tbl;"
