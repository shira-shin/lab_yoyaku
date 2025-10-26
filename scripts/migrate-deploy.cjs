#!/usr/bin/env node
/* eslint-disable no-console */
const { spawnSync } = require('node:child_process');

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

// Prisma の migrate 実行時は DIRECT_URL を強制利用
if (env.DIRECT_URL) {
  env.DATABASE_URL = env.DIRECT_URL;
  console.log('[migrate] using DIRECT_URL as DATABASE_URL for migrations');
}

function run(cmd, args, opts = {}) {
  const final = { stdio: 'pipe', encoding: 'utf8', env, shell: false, ...opts };
  console.log('[migrate] run:', [cmd, ...args].join(' '));
  const res = spawnSync(cmd, args, final);
  return {
    code: res.status,
    stdout: res.stdout || '',
    stderr: res.stderr || '',
    ok: res.status === 0,
  };
}

function deployOnce() {
  return run('pnpm', ['--filter', 'lab_yoyaku-web', 'exec', 'prisma', 'migrate', 'deploy']);
}

function resolveRolledBack(migrationName) {
  console.warn(`[migrate] resolve --rolled-back ${migrationName}`);
  return run('pnpm', ['--filter', 'lab_yoyaku-web', 'exec', 'prisma', 'migrate', 'resolve', '--rolled-back', migrationName]);
}

function parseFailedMigrationName(text) {
  // 例: The `202409160001_group_enhancements` migration started at ... failed
  const m = /The\s+`([^`]+)`\s+migration\s+started[\s\S]*?failed/i.exec(text);
  return m && m[1] ? m[1] : null;
}

function hasP3009(text) {
  return /P3009/.test(text);
}

(function main() {
  const isPreview = env.VERCEL_ENV === 'preview';

  // 1回目: deploy
  let res = deployOnce();
  if (res.ok) {
    console.log('[migrate] deploy: OK');
    process.exit(0);
    return;
  }

  console.warn('[migrate] deploy failed');
  const combined = `${res.stdout}\n${res.stderr}`;

  if (hasP3009(combined)) {
    const failed = parseFailedMigrationName(combined);
    if (!failed) {
      console.warn('[migrate] P3009 detected but failed migration name not found');
      process.exit(1);
      return;
    }

    console.warn(`[migrate] detected failed migration: ${failed}`);
    const r = resolveRolledBack(failed);
    if (!r.ok) {
      console.warn(`[migrate] resolve rolled-back failed: code=${r.code}\n${r.stderr || r.stdout}`);
      process.exit(1);
      return;
    }

    // 再 deploy
    res = deployOnce();
    if (res.ok) {
      console.log('[migrate] deploy after repair: OK');
      process.exit(0);
      return;
    }

    console.warn('[migrate] deploy after repair failed');
    // preview だけ db push を最後の手段として許容
    if (isPreview) {
      console.warn('[migrate] preview fallback: prisma db push --accept-data-loss');
      const p = run('pnpm', ['--filter', 'lab_yoyaku-web', 'exec', 'prisma', 'db', 'push', '--accept-data-loss']);
      if (p.ok) {
        console.log('[migrate] db push: OK');
        process.exit(0);
        return;
      }
      console.warn(`[migrate] db push failed: code=${p.code}\n${p.stderr || p.stdout}`);
    }

    process.exit(1);
    return;
  }

  // P3009 以外の失敗はそのまま失敗で返す
  console.warn(combined.trim());
  process.exit(1);
})();
