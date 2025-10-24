#!/usr/bin/env bash
set -euo pipefail
if [ $# -ne 4 ]; then
  echo "Usage: $0 <user> <password-raw> <host-direct> <db-name>"
  exit 1
fi
user="$1"
raw="$2"
host="$3"   # Direct host (no -pooler)
db="$4"
enc="$(python - <<'PY'
import sys, urllib.parse
print(urllib.parse.quote(sys.argv[1], safe=''))
PY
"$raw")"
export DATABASE_URL="postgresql://${user}:${enc}@${host}/${db}?sslmode=require"
echo "DATABASE_URL set (hidden password)."
python - <<'PY'
import os,re
print(re.sub(r':(.*?)@', '://****@', os.environ.get('DATABASE_URL','')))
PY
