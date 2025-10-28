const fs = require('node:fs');
const crypto = require('node:crypto');
const { execSync } = require('node:child_process');

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

const STRICT = process.env.MIGRATE_STRICT === '1';
const BYPASS = process.env.DISABLE_DRIFT_CHECK === '1';

function sh(cmd, opts = {}) {
  return execSync(cmd, { stdio: 'inherit', shell: true, ...opts });
}

function fail(code, message, detail) {
  console.error(`ERROR ${code}: ${message}`);
  if (detail) {
    console.error(detail);
  }
  process.exit(1);
}

try {
  const list = fs.readdirSync('web/prisma/migrations');
  console.log('[MIGS]', list.join(', '));
} catch {}

function run(cmd, opts = {}) {
  return execSync(cmd, {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: true,
    ...opts,
  });
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
      `pnpm --filter lab_yoyaku-web exec prisma migrate diff \
--from-url "${process.env.DIRECT_URL}" \
--to-schema-datamodel prisma/schema.prisma \
--script`,
      { env: envVars }
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
  return run('pnpm --filter lab_yoyaku-web exec prisma migrate deploy', {
    env: envVars,
  });
}

function diffExitCode(envVars) {
  try {
    run(
      `pnpm --filter lab_yoyaku-web exec prisma migrate diff ` +
        `--from-url "${process.env.DIRECT_URL}" ` +
        '--to-schema-datamodel prisma/schema.prisma --exit-code',
      { env: envVars }
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
  sh('pnpm --filter lab_yoyaku-web exec prisma migrate deploy', { env: envVarsBypass });
  process.exit(0);
}

try {
  execSync('node scripts/codex-preflight.cjs', { stdio: 'inherit', shell: true });
} catch (error) {
  process.exit(error.status || 1);
}

const envVars = { ...process.env, DATABASE_URL: process.env.DIRECT_URL };

console.log('[MIGRATE] deploy...');

let migrateSucceeded = false;

try {
  migrate(envVars);
  console.log('[MIGRATE] done ✅');
  migrateSucceeded = true;
} catch (error) {
  const output = [
    error.stdout?.toString(),
    error.stderr?.toString(),
    error.message,
  ]
    .filter(Boolean)
    .join('\n');

  const isP3018 = /P3018/.test(output);
  const isDup = /(42701|duplicate|already exists)/i.test(output);

  if (isP3018 && isDup) {
    const migrationId = migrationIdFrom(output) || 'unknown';
    const reasonLine =
      output
        .split('\n')
        .find((line) => /already exists|duplicate|42701/i.test(line))?.trim() ||
      'object already exists';

    console.log(
      `[MIGRATE] failed at ${migrationId} (P3018 / ${reasonLine})`
    );
    console.log('[SELF-HEAL] checking diff...');
    const diff = diffFromDb(envVars);
    if (diff.trim().length === 0) {
      console.log('[SELF-HEAL] diff is empty → safe to mark applied');
      try {
        run(
          `pnpm --filter lab_yoyaku-web exec prisma migrate resolve --applied ${migrationId}`,
          { env: envVars }
        );
        console.log(
          `[SELF-HEAL] prisma migrate resolve --applied ${migrationId}`
        );
      } catch (resolveErr) {
        const excerptOutput = excerpt(
          [
            resolveErr.stdout?.toString(),
            resolveErr.stderr?.toString(),
            resolveErr.message,
          ]
            .filter(Boolean)
            .join('\n')
        );
        logLines(
          [
            'ERROR E007: Migration failed and auto-resolve is unsafe.',
            excerptOutput ? `---\n${excerptOutput}` : undefined,
            'Action:',
            '  - Generate repair: prisma migrate diff --from-url "$DIRECT_URL" --to-schema-datamodel prisma/schema.prisma --script > repair.sql',
            '  - Apply: prisma db execute --file repair.sql --url "$DIRECT_URL"',
            '  - Mark applied: prisma migrate resolve --applied <id>',
            '  - Then: pnpm run migrate:deploy',
          ].filter(Boolean),
          true
        );
        process.exit(1);
      }

      console.log('[MIGRATE] retry deploy...');
      try {
        migrate(envVars);
        console.log('[MIGRATE] done ✅');
        migrateSucceeded = true;
      } catch (retryErr) {
        const retryOutput = excerpt(
          [
            retryErr.stdout?.toString(),
            retryErr.stderr?.toString(),
            retryErr.message,
          ]
            .filter(Boolean)
            .join('\n')
        );
        logLines(
          [
            `ERROR E007: Migration '${migrationId}' failed and auto-resolve is unsafe (diff not empty or retry failed).`,
            retryOutput ? `---\n${retryOutput}` : undefined,
            'Action:',
            '  - Generate repair: prisma migrate diff --from-url "$DIRECT_URL" --to-schema-datamodel prisma/schema.prisma --script > repair.sql',
            '  - Apply: prisma db execute --file repair.sql --url "$DIRECT_URL"',
            '  - Mark applied: prisma migrate resolve --applied <id>',
            '  - Then: pnpm run migrate:deploy',
          ].filter(Boolean),
          true
        );
        process.exit(1);
      }
    } else {
      logLines(
        [
          `ERROR E007: Migration '${migrationId}' failed and auto-resolve is unsafe (diff not empty).`,
          'Action:',
          '  - Generate repair: prisma migrate diff --from-url "$DIRECT_URL" --to-schema-datamodel prisma/schema.prisma --script > repair.sql',
          '  - Apply: prisma db execute --file repair.sql --url "$DIRECT_URL"',
          '  - Mark applied: prisma migrate resolve --applied <id>',
          '  - Then: pnpm run migrate:deploy',
        ],
        true
      );
      process.exit(1);
    }
  }

  const excerptOutput = excerpt(output);
  logLines(
    [
      'ERROR E008: prisma migrate deploy failed (unknown).',
      'Excerpt:',
      excerptOutput
        .split('\n')
        .filter(Boolean)
        .slice(0, 20)
        .map((line) => `  ${line}`)
        .join('\n') || '  <no output>',
      'Action: Inspect failing SQL / permissions / network. Re-run with DEBUG=*.',
    ],
    true
  );
  process.exit(1);
}

if (!migrateSucceeded) {
  process.exit(1);
}

const diffExit = diffExitCode(envVars);
if (diffExit.exitCode === 0) {
  console.log('[DRIFT] prisma migrate diff --exit-code -> no diff');
  process.exit(0);
}

if (diffExit.exitCode !== 2) {
  fail('E005', 'prisma migrate diff --exit-code failed unexpectedly.', diffExit.output);
}

const diffSql = diffFromDb(envVars);
const residual = diffSql;
const residualText = normalize(residual);
const residualPreview = residualText.slice(0, 200) || '<empty>';

console.log('[DRIFT] residual.preview=', residualPreview);

if (isEmptyOrBenignDiff(residual)) {
  console.log('[DRIFT] residual is empty/benign -> continue');
} else if (
  !STRICT &&
  /ALTER TABLE\s+"Device".*ALTER COLUMN\s+"qrToken".*SET DEFAULT/i.test(residualText)
) {
  console.log('[DRIFT] benign qrToken-default residual and STRICT=0 -> continue');
} else {
  fail('E006', 'Residual diff remains after auto-fix.', residualText);
}
