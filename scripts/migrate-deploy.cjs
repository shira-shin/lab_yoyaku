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

// migrations は必ず DIRECT_URL を使う
if (env.DIRECT_URL) {
  env.DATABASE_URL = env.DIRECT_URL;
  console.log('[migrate] using DIRECT_URL as DATABASE_URL for migrations');
}

function run(cmd, argsOrOpts, maybeOpts = {}) {
  let args = [];
  let opts = {};

  if (Array.isArray(argsOrOpts)) {
    args = argsOrOpts;
    opts = maybeOpts || {};
  } else if (argsOrOpts && typeof argsOrOpts === 'object') {
    opts = argsOrOpts;
  } else if (typeof argsOrOpts === 'undefined') {
    args = null;
    opts = maybeOpts && typeof maybeOpts === 'object' ? maybeOpts : {};
  } else {
    throw new TypeError('Invalid arguments passed to run');
  }

  if (args === null) {
    const final = { stdio: 'pipe', encoding: 'utf8', env, shell: true, ...opts };
    console.log('[migrate] run:', cmd);
    const res = spawnSync(cmd, final);
    return {
      code: res.status,
      stdout: res.stdout || '',
      stderr: res.stderr || '',
      ok: res.status === 0,
    };
  }

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

function resolveApplied(migrationName) {
  console.warn(`[migrate] resolve --applied ${migrationName}`);
  return run('pnpm', ['--filter', 'lab_yoyaku-web', 'exec', 'prisma', 'migrate', 'resolve', '--applied', migrationName]);
}

function migrateDiagnose() {
  return run('pnpm', ['--filter', 'lab_yoyaku-web', 'exec', 'prisma', 'migrate', 'diagnose', '--json']);
}

function migrateDiffScript() {
  if (!env.DIRECT_URL) {
    console.warn('[migrate] DIRECT_URL is not set; skip migrate diff');
    return null;
  }

  return run(`pnpm --filter lab_yoyaku-web exec prisma migrate diff \
    --from-schema-datamodel prisma/schema.prisma \
    --to-url "${process.env.DIRECT_URL}" \
    --script`);
}

function parseFailedMigrationName(text) {
  // The `202409160001_group_enhancements` migration ... failed
  const m = /The\s+`([^`]+)`\s+migration\s+started[\s\S]*?failed/i.exec(text);
  return m && m[1] ? m[1] : null;
}

function hasP3009(text) { return /P3009/.test(text); }

// よくある再失敗パターンを検出してヒントを出す（ログ可視化強化）
function printHints(all) {
  const lower = all.toLowerCase();
  if (/already exists/.test(lower)) {
    console.warn('[hint] 既存オブジェクト重複（テーブル/インデックス/タイプ等）。過去に一部だけ適用された状態か、手動作成がある可能性。該当 DDL を条件付きに直す or 先に drop する補助 migration が必要です。');
  }
  if (/not null/.test(lower) && /null value/.test(lower)) {
    console.warn('[hint] 既存行に値がない列へ NOT NULL を追加し失敗。安全策: 1) 一旦 NULL 許容 + デフォルト付与 → 2) データ埋め → 3) NOT NULL 制約を追加 の 3 段階に分割してください。');
  }
  if (/enum/i.test(all) && /(alter type|add value)/i.test(all)) {
    console.warn('[hint] enum 変更が失敗している可能性。Neon/Postgres では enum 運用手順が必要。ADD VALUE の順序/既存値を確認してください。');
  }
}

(function main() {
  const isPreview = env.VERCEL_ENV === 'preview';

  // 1) 1回目 deploy
  let res = deployOnce();
  if (res.ok) {
    console.log('[migrate] deploy: OK');
    process.exit(0);
    return;
  }

  console.warn('[migrate] deploy failed');
  let combined = `${res.stdout}\n${res.stderr}`;
  if (hasP3009(combined)) {
    const failed = parseFailedMigrationName(combined);
    if (!failed) {
      console.warn('[migrate] P3009 detected but failed migration name not found');
      console.warn(combined.trim());
      process.exit(1);
      return;
    }

    console.warn(`[migrate] detected failed migration: ${failed}`);
    let repaired = false;

    const diff = migrateDiffScript();
    if (diff && diff.ok) {
      const meaningfulDiff = diff.stdout
        .split('\n')
        .some((line) => {
          const trimmed = line.trim();
          return trimmed && !trimmed.startsWith('--');
        });

      if (!meaningfulDiff) {
        console.warn('[migrate] migrate diff is empty; marking migration as applied');
        const applied = resolveApplied(failed);
        if (applied.ok) {
          repaired = true;
        } else {
          console.warn(`[migrate] resolve applied failed: code=${applied.code}\n${applied.stderr || applied.stdout}`);
        }
      } else {
        console.error('[migrate] diff contains statements. Refusing to --applied automatically.');
        process.exit(1);
      }
    } else if (diff && !diff.ok) {
      console.warn(`[migrate] migrate diff failed: code=${diff.code}\n${diff.stderr || diff.stdout}`);
    }

    if (!repaired) {
      console.warn('[migrate] attempting resolve --applied as fallback');
      const applied = resolveApplied(failed);
      if (!applied.ok) {
        console.warn(`[migrate] resolve applied failed: code=${applied.code}\n${applied.stderr || applied.stdout}`);
        process.exit(1);
        return;
      }
      repaired = true;
    }

    // 2) 再 deploy
    res = deployOnce();
    if (res.ok) {
      console.log('[migrate] deploy after repair: OK');
      process.exit(0);
      return;
    }

    console.warn('[migrate] deploy after repair failed');
    combined = `${res.stdout}\n${res.stderr}`;
    // 失敗理由を必ず出す
    console.warn(combined.trim());

    // 追加診断
    const diag = migrateDiagnose();
    console.warn('[migrate] diagnose json (exit', diag.code, '):');
    console.warn((diag.stdout || diag.stderr || '').trim());

    printHints(combined + '\n' + diag.stdout + '\n' + diag.stderr);

    // preview だけ最後に db push を許可（本番はしない）
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

  // P3009 以外の失敗
  console.warn(combined.trim());
  const diag = migrateDiagnose();
  console.warn('[migrate] diagnose json (exit', diag.code, '):');
  console.warn((diag.stdout || diag.stderr || '').trim());
  printHints(combined + '\n' + diag.stdout + '\n' + diag.stderr);
  process.exit(1);
})();
