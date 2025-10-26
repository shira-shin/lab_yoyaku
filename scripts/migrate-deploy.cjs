const { spawnSync } = require('node:child_process');
const path = require('node:path');

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { stdio: 'inherit', shell: false, ...opts });
  if (res.status !== 0) {
    const err = new Error(`[migrate] command failed: ${cmd} ${args.join(' ')} (code ${res.status})`);
    err.code = res.status;
    throw err;
  }
}

function tryRun(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { stdio: 'inherit', shell: false, ...opts });
  return res.status === 0;
}

function envWithDirectUrl(baseEnv) {
  const out = { ...baseEnv };
  if (baseEnv.DIRECT_URL && baseEnv.DIRECT_URL.trim()) {
    // Prisma CLI は DATABASE_URL を読む。writer を必ず使う。
    out.DATABASE_URL = baseEnv.DIRECT_URL;
    console.log('[migrate] using DIRECT_URL as DATABASE_URL for migrations');
  }
  return out;
}

function prisma(args, env) {
  run('pnpm', ['--filter', 'lab_yoyaku-web', 'prisma', ...args], { env });
}

function prismaStatusJson(env) {
  const res = spawnSync('pnpm', ['--filter', 'lab_yoyaku-web', 'prisma', 'migrate', 'status', '--json'], { env, encoding: 'utf8' });
  if (res.status !== 0) return null;
  try { return JSON.parse(res.stdout || '{}'); } catch { return null; }
}

(function main() {
  const root = process.cwd();
  const webDir = path.join(root, 'web');

  const baseEnv = { ...process.env };
  const env = envWithDirectUrl(baseEnv);

  console.log(`[migrate] cwd=${root} webDir=${webDir} vercelEnv=${env.VERCEL_ENV || ''}`);

  // 1) 通常デプロイ
  try {
    prisma(['migrate', 'deploy'], env);
    console.log('[migrate] deploy: OK');
    return;
  } catch (e1) {
    console.warn('[migrate] deploy failed, will inspect…');
  }

  // 2) 失敗時—P3009（失敗済みmigration）を自己修復
  const st = prismaStatusJson(env);
  const failed = st && Array.isArray(st.failedMigrationNames) ? st.failedMigrationNames[0] : null;
  if (failed) {
    console.warn(`[migrate] detected failed migration: ${failed} -> resolve as rolled-back`);
    tryRun('pnpm', ['--filter', 'lab_yoyaku-web', 'prisma', 'migrate', 'resolve', '--rolled-back', failed], { env });
    // 再トライ
    try {
      prisma(['migrate', 'deploy'], env);
      console.log('[migrate] deploy after resolve: OK');
      return;
    } catch (e2) {
      console.warn('[migrate] deploy still failing after resolve.');
    }
  }

  // 3) preview のみ db push フォールバック（本番では絶対にやらない）
  if ((env.VERCEL_ENV || '').toLowerCase() === 'preview') {
    console.warn('[migrate] preview fallback: prisma db push --accept-data-loss');
    prisma(['db', 'push', '--accept-data-loss'], env);
    console.log('[migrate] db push: OK');
    return;
  }

  throw new Error('[migrate] final failure (not preview and could not deploy migrations)');
})();
