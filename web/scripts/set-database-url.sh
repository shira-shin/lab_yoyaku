#!/usr/bin/env bash
set -euo pipefail
if [ $# -ne 4 ]; then
  echo "Usage: $0 <user> <password-raw> <host-direct> <db-name>" >&2
  exit 1
fi

user="$1"
raw="$2"
host="$3"
db="$4"

if [[ "$host" == *"-pooler"* ]]; then
  echo "Error: host must be the direct Neon endpoint (no -pooler)." >&2
  exit 1
fi

if [[ "$host" != *.* ]]; then
  echo "Error: host must contain a region suffix (expected something like ep-xxxxx.ap-southeast-1.aws.neon.tech)." >&2
  exit 1
fi

enc="$(python - <<'PY'
import sys, urllib.parse
print(urllib.parse.quote(sys.argv[1], safe=''))
PY
"$raw")"

pooler_host="${host%%.*}-pooler.${host#*.}"

export DIRECT_URL="postgresql://${user}:${enc}@${host}/${db}?sslmode=require"
export DATABASE_URL="postgresql://${user}:${enc}@${pooler_host}/${db}?sslmode=require"

echo "DATABASE_URL exported for this shell (password hidden):"
python - <<'PY'
import os, re
url = os.environ.get('DATABASE_URL', '')
print(re.sub(r':(.*?)@', '://****@', url))
PY

echo "DIRECT_URL exported for this shell (password hidden):"
python - <<'PY'
import os, re
url = os.environ.get('DIRECT_URL', '')
print(re.sub(r':(.*?)@', '://****@', url))
PY
