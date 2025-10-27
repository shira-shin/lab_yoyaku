const { execSync } = require('node:child_process');
const fs = require('node:fs');

function run(cmd, opts = {}) {
  return execSync(cmd, {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: true,
    ...opts,
  });
}

function epId(url) {
  // 例: ep-bitter-leaf-a1bq8tp9[-pooler].ap-southeast-1.aws.neon.tech
  const host = String(url || '').split('@')[1]?.split('/')[0] || '';
  const firstLabel = host.split('.')[0]; // ep-xxx[-pooler]
  return firstLabel?.replace(/-pooler$/, '') || null; // -pooler を無視
}

const env = process.env.VERCEL_ENV || '';
const DB = process.env.DATABASE_URL || '';
const DIRECT = process.env.DIRECT_URL || '';

console.log(`[preflight] VERCEL_ENV=${env}`);

if (env !== 'production' && process.env.MIGRATE_ON_PREVIEW !== '1') {
  console.log('[preflight] Non-production -> skip');
  process.exit(0);
}

// 1) endpoint match
const epDb = epId(DB);
const epDirect = epId(DIRECT);
console.log(`[preflight] epDb=${epDb}, epDirect=${epDirect}`);
if (!epDb || !epDirect || epDb !== epDirect) {
  console.error('[preflight] ERROR: DATABASE_URL and DIRECT_URL ep-id mismatch or missing');
  process.exit(1);
}

// 2) schema path
const schema = 'web/prisma/schema.prisma';
if (!fs.existsSync(schema)) {
  console.error(`[preflight] ERROR: schema not found: ${schema}`);
  process.exit(1);
}

// 3) DB connectivity (Prisma 経由、web/ に固定・--schema 明示・URL二重指定)
const host = (process.env.DIRECT_URL || '').split('@')[1]?.split('/')[0] || '';
console.log(`[preflight] connecting host=${host}`);
try {
  const envVars = { ...process.env, DATABASE_URL: process.env.DIRECT_URL };
  run(
    `pnpm --filter lab_yoyaku-web exec prisma migrate status \
     --schema prisma/schema.prisma \
     --url "${process.env.DIRECT_URL}" \
     1>/dev/null`,
    { env: envVars }
  );
} catch (e) {
  const out = (e.stdout?.toString() || e.message || '').slice(0, 2000);
  console.error('[preflight] ERROR: DB connectivity failed\n' + out);
  process.exit(1);
}

// 4) forbid dangerous DDL in latest migration (optional policy)
try {
  const latest = run('ls -1d web/prisma/migrations/* | tail -n 1').trim();
  const sql = `${latest}/migration.sql`;
  if (fs.existsSync(sql)) {
    const txt = fs.readFileSync(sql, 'utf8');
    const danger = /(DROP\s+TABLE|DROP\s+COLUMN|ALTER\s+TYPE\s+.*\sDROP\s+VALUE)/i;
    if (danger.test(txt) && !/SAFE_DROP_OK/.test(txt)) {
      console.error(`[preflight] ERROR: dangerous DDL in ${sql} (no SAFE_DROP_OK)`);
      process.exit(1);
    }
  }
} catch {
  // ignore if no migrations
}

// 5) diff (DB -> schema)
try {
  const diff = run(`cd web && pnpm exec prisma migrate diff \
    --from-url "${DIRECT}" \
    --to-schema-datamodel prisma/schema.prisma \
    --script`);
  if (diff.trim().length > 0) {
    console.error('[preflight] diff contains statements. Refusing to proceed.\n---\n' + diff.substring(0, 2000));
    process.exit(1);
  }
  console.log('[preflight] diff empty ✅');
} catch (e) {
  console.error('[preflight] ERROR: prisma migrate diff failed');
  console.error(String(e.stdout || e.output || e.message || e));
  process.exit(1);
}

console.log('[preflight] OK');
