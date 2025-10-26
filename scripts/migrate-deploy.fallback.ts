import { execSync } from 'node:child_process';
import path from 'node:path';

const repoRoot = path.resolve(__dirname, '..');
const webDir = path.resolve(repoRoot, 'web');

type NormalizedEnv = Record<string, string | undefined>;

function normalizeEnv(input: Record<string, unknown>): NormalizedEnv {
  const out: NormalizedEnv = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) {
      out[key] = undefined;
    } else if (typeof value === 'string') {
      out[key] = value;
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      out[key] = String(value);
    } else {
      out[key] = undefined;
    }
  }
  return out;
}

function buildMigrateEnv(): NormalizedEnv {
  const base = normalizeEnv(process.env);
  if (base.DIRECT_URL) {
    base.DATABASE_URL = base.DIRECT_URL;
  }
  if (typeof base.NODE_ENV !== 'string') {
    base.NODE_ENV =
      typeof process.env.NODE_ENV === 'string' ? process.env.NODE_ENV : 'production';
  }
  return base;
}

function run(cmd: string) {
  const env = buildMigrateEnv();
  execSync(cmd, { stdio: 'inherit', cwd: webDir, env: env as NodeJS.ProcessEnv });
}

function capture(cmd: string): string {
  return execSync(cmd, {
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd: webDir,
    env: buildMigrateEnv() as NodeJS.ProcessEnv,
  }).toString();
}

function extractFailedMigration(msg: string): string | null {
  // ex) The `202409160001_group_enhancements` migration started at ...
  const m = msg.match(/The\s+`([^`]+)`\s+migration\s+started/i);
  return m?.[1] ?? null;
}

export async function migrateDeployWithRepair() {
  try {
    run('pnpm --filter lab_yoyaku-web exec prisma migrate deploy');
    console.log('[migrate:fallback] prisma migrate deploy: OK');
    return;
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    console.warn('[migrate:fallback] deploy failed:', msg);

    // P3009: failed migrations が残っている
    if (/P3009/.test(msg)) {
      // 失敗マイグレーション名を抽出
      let failed = extractFailedMigration(msg);
      if (!failed) {
        // 追加情報を取得（stderr に出ない環境向けの保険）
        try {
          const out = capture('pnpm --filter lab_yoyaku-web exec prisma migrate status --json');
          const j = JSON.parse(out);
          failed = j?.failedMigrationNames?.[0] ?? null;
        } catch {}
      }

      if (failed) {
        console.warn(`[migrate:fallback] resolve --rolled-back "${failed}"`);
        run(`pnpm --filter lab_yoyaku-web exec prisma migrate resolve --rolled-back "${failed}"`);
      } else {
        console.warn('[migrate:fallback] failed migration name not found; continue with deploy retry');
      }

      try {
        run('pnpm --filter lab_yoyaku-web exec prisma migrate deploy');
        console.log('[migrate:fallback] prisma migrate deploy: OK (after resolve)');
        return;
      } catch (e2: any) {
        console.warn('[migrate:fallback] deploy retry failed:', e2?.message ?? String(e2));
        // preview 環境だけ db push を許可
        if (process.env.VERCEL_ENV === 'preview') {
          console.warn('[migrate:fallback] preview fallback: prisma db push --accept-data-loss');
          run('pnpm --filter lab_yoyaku-web exec prisma db push --accept-data-loss');
          console.log('[migrate:fallback] prisma db push: OK');
          return;
        }
        throw e2;
      }
    }
    throw e;
  }
}

// CJS でも直接実行できるように
export default { migrateDeployWithRepair };
