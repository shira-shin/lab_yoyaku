import { execSync } from 'node:child_process';
import path from 'node:path';

const repoRoot = path.resolve(__dirname, '..');
const webDir   = path.resolve(repoRoot, 'web');

const env = {
  ...process.env,
  // Prisma は pooler より DIRECT_URL の直ホストを使う
  DATABASE_URL: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
};

function run(cmd: string) {
  execSync(cmd, { stdio: 'inherit', shell: true, cwd: webDir, env });
}

function capture(cmd: string): string {
  return execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'], shell: true, cwd: webDir, env }).toString();
}

function extractFailedMigration(msg: string): string | null {
  // ex) The `202409160001_group_enhancements` migration started at ...
  const m = msg.match(/The\s+`([^`]+)`\s+migration\s+started/i);
  return m?.[1] ?? null;
}

export async function migrateDeployWithRepair() {
  try {
    run('prisma migrate deploy');
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
          const out = capture('prisma migrate status --json');
          const j = JSON.parse(out);
          failed = j?.failedMigrationNames?.[0] ?? null;
        } catch {}
      }

      if (failed) {
        console.warn(`[migrate:fallback] resolve --rolled-back "${failed}"`);
        run(`prisma migrate resolve --rolled-back "${failed}"`);
      } else {
        console.warn('[migrate:fallback] failed migration name not found; continue with deploy retry');
      }

      try {
        run('prisma migrate deploy');
        console.log('[migrate:fallback] prisma migrate deploy: OK (after resolve)');
        return;
      } catch (e2: any) {
        console.warn('[migrate:fallback] deploy retry failed:', e2?.message ?? String(e2));
        // preview 環境だけ db push を許可
        if (process.env.VERCEL_ENV === 'preview') {
          console.warn('[migrate:fallback] preview fallback: prisma db push --accept-data-loss');
          run('prisma db push --accept-data-loss');
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
