#!/usr/bin/env node
const { execSync } = require('node:child_process');

function normalizeEnv(src) {
  const out = {};
  for (const k in src) {
    const v = src[k];
    if (v == null) continue;
    out[k] = typeof v === 'string' ? v : String(v);
  }
  return out;
}

const env = normalizeEnv(process.env);
if (env.DIRECT_URL) {
  env.DATABASE_URL = env.DIRECT_URL;
  console.log('[migrate] using DIRECT_URL as DATABASE_URL for migrations');
}

function run(cmd) {
  console.log('[migrate] run:', cmd);
  execSync(cmd, { stdio: 'inherit', shell: true, env });
}

try {
  // Prisma を script 経由ではなく **バイナリ実行**する
  run('pnpm --filter lab_yoyaku-web exec prisma migrate deploy');
  console.log('[migrate] deploy: OK');
} catch (e) {
  const msg = String(e && e.message ? e.message : e);
  console.warn('[migrate] deploy failed:', msg);

  // preview のみフォールバック許容
  if (env.VERCEL_ENV === 'preview') {
    console.warn('[migrate] preview fallback: prisma db push --accept-data-loss');
    run('pnpm --filter lab_yoyaku-web exec prisma db push --accept-data-loss');
    console.log('[migrate] db push: OK');
  } else {
    process.exitCode = 1;
  }
}
