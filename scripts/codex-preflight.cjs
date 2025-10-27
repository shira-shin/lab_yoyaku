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
  const host = String(url || '').split('@')[1]?.split('/')[0] || '';
  const firstLabel = host.split('.')[0];
  return firstLabel?.replace(/-pooler$/, '') || null;
}

function exit(code, messageLines = []) {
  if (messageLines.length > 0) {
    console[code === 0 ? 'log' : 'error'](messageLines.join('\n'));
  }
  process.exit(code);
}

const env = process.env.VERCEL_ENV || '';
const overridePreview = process.env.MIGRATE_ON_PREVIEW === '1';
const databaseUrl = process.env.DATABASE_URL || '';
const directUrl = process.env.DIRECT_URL || '';

console.log(`[ENV] VERCEL_ENV=${env}`);

if (env !== 'production' && !overridePreview) {
  console.log('INFO [ENV] Non-production. Skip migrations.');
  process.exit(0);
}

const epDb = epId(databaseUrl);
const epDirect = epId(directUrl);

if (!epDb || !epDirect || epDb !== epDirect) {
  if (env === 'production') {
    exit(1, [
      'ERROR E002: DATABASE_URL and DIRECT_URL point to different Neon endpoints.',
      `db=${epDb || 'n/a'}, direct=${epDirect || 'n/a'}`,
      'Action:',
      '  - In Vercel (Production), make these two variables refer to the same ep-id.',
      '  - DATABASE_URL should be the *-pooler of the same ep-id; DIRECT_URL should be the direct host.',
    ]);
  } else {
    console.log(
      `WARN [EP] mismatch (db=${epDb || 'n/a'}, direct=${epDirect || 'n/a'})`
    );
  }
} else {
  console.log(`[EP] epDb=${epDb}, epDirect=${epDirect} (ok)`);
}

const schemaPath = 'web/prisma/schema.prisma';
if (!fs.existsSync(schemaPath)) {
  exit(1, [
    'ERROR E003: Prisma schema not found at web/prisma/schema.prisma.',
    'Action: Ensure the path is correct in repo and build CWD.',
  ]);
}
console.log('[SCHEMA] found web/prisma/schema.prisma (ok)');

const directHost = directUrl.split('@')[1]?.split('/')[0] || '';
try {
  const envVars = { ...process.env, DATABASE_URL: directUrl };
  const connectivityCmd = [
    'printf "SELECT 1;" | pnpm --filter lab_yoyaku-web exec prisma db execute',
    '--stdin --schema prisma/schema.prisma 1>/dev/null',
  ].join(' \\\n');
  run(connectivityCmd, { env: envVars });
  console.log(`[DB] connecting host=${directHost} (ok)`);
} catch (error) {
  const out = (
    error.stderr?.toString() || error.stdout?.toString() || error.message || ''
  ).slice(0, 2000);
  exit(1, [
    'ERROR E004: DB connectivity failed.',
    `host=${directHost || 'n/a'}`,
    'Tried: prisma db execute --stdin "SELECT 1;"',
    'Hints:',
    '  - Check DIRECT_URL credentials / password.',
    "  - Ensure '?sslmode=require&channel_binding=require' is intact and quoted.",
    "  - Verify Neon role 'neondb_owner' allows connections to this branch.",
    out ? `---\n${out}` : undefined,
  ].filter(Boolean));
}

let latestMigrationSql = null;
try {
  const list = run('ls -1d web/prisma/migrations/* 2>/dev/null')
    .split('\n')
    .filter(Boolean);
  const latest = list[list.length - 1];
  if (latest) {
    const sql = `${latest}/migration.sql`;
    if (fs.existsSync(sql)) {
      latestMigrationSql = sql;
      const txt = fs.readFileSync(sql, 'utf8');
      const danger = /(DROP\s+TABLE|DROP\s+COLUMN|ALTER\s+TYPE\s+.*\sDROP\s+VALUE)/i;
      if (danger.test(txt) && !/SAFE_DROP_OK/.test(txt)) {
        exit(1, [
          'ERROR E005: Dangerous DDL detected in latest migration (DROP ...). No SAFE_DROP_OK tag.',
          `File: ${sql}`,
          "Action: Add comment '/* SAFE_DROP_OK */' or refactor migration to safe/conditional DDL.",
        ]);
      }
    }
  }
} catch (error) {
  // ignore listing errors; treated as no migrations
}
if (latestMigrationSql) {
  console.log('[DDL] latest migration safe (ok)');
} else {
  console.log('[DDL] no migrations detected (ok)');
}

let diffOutput = '';
try {
  diffOutput = run(
    `pnpm --filter lab_yoyaku-web exec prisma migrate diff \
--from-url "${directUrl}" \
--to-schema-datamodel prisma/schema.prisma \
--script`
  );
} catch (error) {
  const stdout = error.stdout?.toString() || '';
  if (stdout.trim().length > 0) {
    diffOutput = stdout;
  } else {
    const msg = (error.stderr?.toString() || error.message || '').slice(0, 2000);
    exit(1, [
      'ERROR E006: Database state diverges from schema.',
      'Failed to compute prisma migrate diff output.',
      msg ? `---\n${msg}` : undefined,
      'Action (prod DB):',
      '  1) Run: pnpm -F lab_yoyaku-web exec prisma migrate diff --from-url "$DIRECT_URL" --to-schema-datamodel prisma/schema.prisma --script > repair.sql',
      '  2) Review repair.sql and apply carefully, then resolve blocking migrations.',
      '  3) Re-run: pnpm run migrate:deploy',
    ].filter(Boolean));
  }
}

if (diffOutput.trim().length > 0) {
  fs.writeFileSync('/tmp/repair.sql', diffOutput);
  const preview = diffOutput.slice(0, 2000);
  exit(1, [
    'ERROR E006: Database state diverges from schema.',
    'A repair script has been written to /tmp/repair.sql (first 2KB echoed below).',
    `---\n${preview}`,
    'Action (prod DB):',
    '  1) Review /tmp/repair.sql for destructive statements.',
    '  2) Apply it: pnpm -F lab_yoyaku-web exec prisma db execute --file /tmp/repair.sql --url "$DIRECT_URL"',
    '  3) For each blocking migration, run: prisma migrate resolve --applied <id>',
    '  4) Re-run: pnpm run migrate:deploy',
  ]);
}

console.log('[DIFF] DB→Schema: clean ✅');
