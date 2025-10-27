const { execSync } = require('node:child_process');

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

function excerpt(output, limit = 2000) {
  return output.slice(0, limit);
}

const env = process.env.VERCEL_ENV || '';
const overridePreview = process.env.MIGRATE_ON_PREVIEW === '1';

if (env !== 'production' && !overridePreview) {
  console.log('INFO [ENV] Non-production. Skip migrations.');
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

const residualDiffRaw = diffFromDb(envVars);
const residualDiff = residualDiffRaw.trim();

if (!residualDiff) {
  console.log('[MIGRATE] diff clean ✅');
} else {
  const STRICT = process.env.MIGRATE_STRICT !== '0';
  console.log(
    `[STRICT] MIGRATE_STRICT=${process.env.MIGRATE_STRICT ?? 'unset'} -> STRICT=${STRICT}`
  );

  function isDefaultOnlyDrift(txt) {
    if (!txt) return false;
    const body = txt
      .replace(/^-{3,}.*$/gm, '')
      .replace(/^\s*--.*$/gm, '')
      .replace(/\s+/g, ' ')
      .trim();
    return /^ALTER TABLE "?Device"? ALTER COLUMN "?qrToken"? SET DEFAULT md5\(.+\);?$/i.test(body);
  }

  const preview = excerpt(residualDiffRaw);

  if (residualDiff && residualDiff.trim()) {
    if (!STRICT && isDefaultOnlyDrift(residualDiff)) {
      console.warn('[W006] Default-only drift for Device.qrToken -> proceed (MIGRATE_STRICT=0)');
      if (preview) {
        console.warn(`---\n${preview}`);
      }
    } else if (STRICT) {
      logLines(
        [
          'ERROR E006: Residual diff remains after auto-fix.',
          preview ? `---\n${preview}` : undefined,
          'Action: Review drift and repair before re-deploying.',
        ].filter(Boolean),
        true
      );
      process.exit(1);
    } else {
      console.warn('[W006] Residual diff present; proceeding due to MIGRATE_STRICT=0');
      if (preview) {
        console.warn(`---\n${preview}`);
      }
    }
  }
}
