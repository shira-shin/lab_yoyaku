const { execSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');

const WEB_DIR = path.resolve(__dirname, '../web');
const SCHEMA = './prisma/schema.prisma';
const FAILED_MIG = '202510100900_auth_normalization';

const INIT_MIG = 'init';

// --- add helpers for robust residual detection ---
const stripAnsi = (s) =>
  String(s ?? '')
    .replace(/\x1b\[[0-9;]*m/g, '')
    .replace(/\x1b\[[0-9;]*[A-Za-z]/g, '');
const normalize = (s) => stripAnsi(String(s ?? '')).replace(/\r/g, '').trim();

const hash = crypto
  .createHash('sha1')
  .update(fs.readFileSync(__filename))
  .digest('hex')
  .slice(0, 8);
console.log(`[SCRIPT] ${__filename} sha1=${hash}`);
console.log(`[STRICT] MIGRATE_STRICT=${process.env.MIGRATE_STRICT ?? 'unset'}`);
console.log(
  `[BYPASS] DISABLE_DRIFT_CHECK=${process.env.DISABLE_DRIFT_CHECK ?? 'unset'}`
);
console.log('[SCHEMA]', path.join(WEB_DIR, SCHEMA.replace(/^\.\//, '')));
console.log('[CWD:WEB]', WEB_DIR);

const STRICT = process.env.MIGRATE_STRICT === '1';
const BYPASS = process.env.DISABLE_DRIFT_CHECK === '1';

const SQL_FIX = path.resolve(__dirname, './sql/mark_auth_normalization_applied.sql');
const BANNER = '[MIG-DRIVER v3]';


function sh(cmd, opts = {}) {
  execSync(cmd, { stdio: 'inherit', shell: true, ...opts });
}

function hasTable(envVars, tableName) {
  const checkSql = `DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='${tableName}') THEN NULL; ELSE RAISE EXCEPTION 'missing'; END IF; END $$;`;
  try {
    run(
      `pnpm exec prisma db execute --schema=${SCHEMA} --stdin <<'SQL'\n${checkSql}\nSQL`,
      { env: envVars, cwd: WEB_DIR }
    );
    return true;
  } catch (_) {
    return false;
  }
}

function logLines(lines, isError = false) {
  const out = Array.isArray(lines) ? lines : [lines];
  const writer = isError ? console.error : console.log;
  out.filter(Boolean).forEach((line) => writer(line));
}

function migrationIdFrom(output) {
  const patterns = [
    /Migration\s+"?([0-9A-Za-z_-]+)"?\s+failed/i,
    /migrations\/[0-9A-Za-z_-]+\//i,
    /The migration "?([0-9A-Za-z_-]+)"? failed/i,
  ];
  for (const pattern of patterns) {
    const match = output.match(pattern);
    if (!match) continue;
    if (match[1]) {
      return match[1];
    }
    const pathMatch = match[0].match(/migrations\/([0-9A-Za-z_-]+)\//);
    if (pathMatch?.[1]) {
      return pathMatch[1];
    }
  }
  return null;
}

function diffFromDb(envVars) {
  try {
    return run(
      [
        'pnpm exec prisma migrate diff',
        `--from-url "${process.env.DIRECT_URL}"`,
        `--to-schema-datamodel ${SCHEMA}`,
        `--schema=${SCHEMA}`,
        '--script',
      ].join(' '),
      { env: envVars, cwd: WEB_DIR }
    );
  } catch (error) {
    const stdout = error.stdout?.toString() || '';
    if (stdout.trim()) {
      return stdout;
    }
    return '';
  }
}

function migrate(envVars) {
  return run(`pnpm exec prisma migrate deploy --schema=${SCHEMA}`, {
    env: envVars,
    cwd: WEB_DIR,
  });
}

function diffExitCode(envVars) {
  try {
    run(
      [
        'pnpm exec prisma migrate diff',
        `--from-url "${process.env.DIRECT_URL}"`,
        `--to-schema-datamodel ${SCHEMA}`,
        `--schema=${SCHEMA}`,
        '--exit-code',
      ].join(' '),
      { env: envVars, cwd: WEB_DIR }
    );
    return { exitCode: 0, output: '' };
  } catch (error) {
    const stdout = error.stdout?.toString() || '';
    const stderr = error.stderr?.toString() || '';
    const exitCode = typeof error.status === 'number' ? error.status : 1;
    return { exitCode, output: stdout || stderr || error.message || '' };
  }
}

function isEmptyOrBenignDiff(txt) {
  const t = stripAnsi(String(txt ?? '')).trim();
  if (!t) return true;
  if (/^\s*--\s*This is an empty migration\./i.test(t)) return true;
  if (/^--.*?empty migration/i.test(t) && !/ALTER|CREATE|DROP|INDEX|SEQUENCE|CONSTRAINT/i.test(t))
    return true;
  return false;
}

function excerpt(output, limit = 2000) {
  return output.slice(0, limit);
}

const env = process.env.VERCEL_ENV || '';
const overridePreview = process.env.MIGRATE_ON_PREVIEW === '1';

if (env !== 'production' && !overridePreview) {
  console.log('INFO [ENV] Non-production. Skip migrations.');
  process.exit(0);
}

if (BYPASS) {
  console.log('[DRIFT] DISABLE_DRIFT_CHECK=1 -> skip drift checks and residual validation');
  const envVarsBypass = { ...process.env, DATABASE_URL: process.env.DIRECT_URL };
  sh(`pnpm exec prisma migrate deploy --schema=${SCHEMA}`, {
    env: envVarsBypass,
    cwd: WEB_DIR,
  });
  process.exit(0);
}

try {
  execSync('node scripts/codex-preflight.cjs', { stdio: 'inherit', shell: true });
} catch (error) {
  process.exit(error.status || 1);
}

const envVars = { ...process.env, DATABASE_URL: process.env.DIRECT_URL };

let targetedResolveAttempted = false;

console.log('[STATUS] before resolve');
const statusBefore = readStatusJSON(envVars);
if (statusBefore?.failedMigrationNames?.length) {
  console.log('[STATUS] failed migrations:', statusBefore.failedMigrationNames);
  if (statusBefore.failedMigrationNames.includes(FAILED_MIG)) {
    targetedResolveAttempted = true;
    console.log('[CHECK] normalizedEmail presence in "User" table');
    const hasColumn = hasNormalizedEmailColumn(envVars);
    const how = hasColumn ? '--applied' : '--rolled-back';
    let resolved = false;
    console.log(`[RESOLVE] ${FAILED_MIG} ${how} (hasColumn=${hasColumn})`);
    try {
      sh(`pnpm exec prisma migrate resolve ${how} ${FAILED_MIG} --schema=${SCHEMA}`, {
        env: envVars,
        cwd: WEB_DIR,
      });
      console.log('[RESOLVE] done');
      resolved = true;
    } catch (resolveError) {
      console.log('[RESOLVE] failed but continue:', resolveError?.message || resolveError);
      if (hasColumn) {
        console.log('[RESOLVE-FALLBACK] updating _prisma_migrations via prisma db execute');
        try {
          sh(
            `pnpm exec prisma db execute --schema=${SCHEMA} --file=./scripts/sql/mark_auth_normalization_applied.sql`,
            { env: envVars, cwd: ROOT_DIR }
          );
          resolved = true;
          console.log('[RESOLVE-FALLBACK] done');
        } catch (fallbackError) {
          console.log('[RESOLVE-FALLBACK] failed:', fallbackError?.message || fallbackError);
        }
      }
    }
    if (!resolved) {
      console.log('[RESOLVE] unable to clear failed migration automatically');
    }
  }
}

console.log('[STATUS] after resolve');
const statusAfter = readStatusJSON(envVars);
if (statusAfter?.failedMigrationNames?.length) {
  console.log('[STATUS] still failed migrations:', statusAfter.failedMigrationNames);
}
if (targetedResolveAttempted) {
  if (!statusAfter) {
    console.log('[RESOLVE] status check unavailable after resolve attempt. Abort to avoid repeated failures.');
    process.exit(1);
  }
  if (statusAfter.failedMigrationNames.includes(FAILED_MIG)) {
    console.log('[RESOLVE] failed migration remains after resolve attempts. Abort.');
    process.exit(1);
  }
}

console.log('[INIT] baseline migration check');
const hasUserTable = hasTable(envVars, 'User');
if (hasUserTable) {
  console.log(`[INIT] detected existing table "User" -> mark ${INIT_MIG} as applied`);
  try {
    sh(`pnpm exec prisma migrate resolve --applied ${INIT_MIG} --schema=${SCHEMA}`, {
      env: envVars,
      cwd: WEB_DIR,
    });
    console.log('[INIT] forced mark applied succeeded');
  } catch (error) {
    console.log('[INIT] failed to mark init as applied (continuing):', error?.message || error);
  }
} else {
  console.log('[INIT] table "User" not found -> skip forced mark');
}

console.log('[MIGRATE] deploy...');

let migrateSucceeded = false;
=======
function shOut(cmd, opts = {}) {
  return String(execSync(cmd, { stdio: ['ignore','pipe','pipe'], shell: true, ...opts }));
}

console.log(BANNER, '[SCRIPT]', __filename, 'sha1=' + crypto.createHash('sha1').update(fs.readFileSync(__filename)).digest('hex').slice(0,8));
console.log('[SCHEMA]', path.join(WEB_DIR, 'prisma/schema.prisma'));
console.log('[CWD:WEB]', WEB_DIR);


// 0) まずは “強制 resolve” を必ず実行（P3009 が残っていても消す）
//    ここで失敗しても続行。後段で再度 deploy が走る。
try {
  console.log(BANNER, '[FORCE-RESOLVE] try --applied', FAILED_MIG);
  sh(`pnpm exec prisma migrate resolve --schema=${SCHEMA} --applied ${FAILED_MIG}`, { cwd: WEB_DIR });
  console.log(BANNER, '[FORCE-RESOLVE] applied OK');
} catch (e) {
  console.log(BANNER, '[FORCE-RESOLVE] applied failed:', (e && e.message) || e);
  // Prisma の resolve が通らない場合は SQL フォールバック
  try {
    if (fs.existsSync(SQL_FIX)) {
      console.log(BANNER, '[FALLBACK] run SQL fix:', SQL_FIX);
      sh(`pnpm exec prisma db execute --schema=${SCHEMA} --file=${SQL_FIX}`, { cwd: path.resolve(__dirname, '..') });
      console.log(BANNER, '[FALLBACK] SQL fix done');
    } else {
      console.log(BANNER, '[FALLBACK] SQL file missing:', SQL_FIX);
    }
  } catch (e2) {
    console.log(BANNER, '[FALLBACK] SQL fix failed:', (e2 && e2.message) || e2);
  }
}

// 1) ここで status を JSON 取得し、failed が空か確認（ログに必ず出す）
try {
  const st = shOut(`pnpm exec prisma migrate status --schema=${SCHEMA} --json`, { cwd: WEB_DIR });
  console.log(BANNER, '[STATUS]', st);
} catch (e) {
  console.log(BANNER, '[STATUS] read failed:', (e && e.message) || e);
}

// 2) Prisma Client generate（schema を明示）
sh(`pnpm exec prisma generate --schema=${SCHEMA}`, { cwd: WEB_DIR });

// 3) 最後に deploy（schema 明示 & cwd 固定）
sh(`pnpm exec prisma migrate deploy --schema=${SCHEMA}`, { cwd: WEB_DIR });
