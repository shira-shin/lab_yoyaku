import { execSync } from 'node:child_process';
import path from 'node:path';

// このファイルは web/ 内にあるので web ルートを相対で辿る
const webRoot = path.resolve(__dirname, '../../../');

const env = {
  ...process.env,
  DATABASE_URL: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
};

function run(cmd: string) {
  execSync(`pnpm exec ${cmd}`, { stdio: 'inherit', shell: true, cwd: webRoot, env });
}

export async function migrateDeployWithRepair() {
  try {
    run('prisma migrate deploy');
    console.log('[web:migrate] prisma migrate deploy: OK');
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    console.warn('[web:migrate] deploy failed:', msg);
    if (/P3009/.test(msg)) {
      // 失敗マイグレーション名は status から取得（より安定）
      try {
        const json = execSync('pnpm exec prisma migrate status --json', {
          stdio: ['ignore', 'pipe', 'pipe'],
          shell: true,
          cwd: webRoot,
          env,
        }).toString();
        const info = JSON.parse(json);
        const failed: string | undefined = info?.failedMigrationNames?.[0];
        if (failed) {
          console.warn(`[web:migrate] resolve --rolled-back "${failed}"`);
          run(`prisma migrate resolve --rolled-back "${failed}"`);
        }
      } catch {}

      try {
        run('prisma migrate deploy');
        console.log('[web:migrate] prisma migrate deploy: OK (after resolve)');
      } catch (e2: any) {
        console.warn('[web:migrate] deploy retry failed:', e2?.message ?? String(e2));
        if (process.env.VERCEL_ENV === 'preview') {
          console.warn('[web:migrate] preview fallback: prisma db push --accept-data-loss');
          run('prisma db push --accept-data-loss');
          console.log('[web:migrate] prisma db push: OK');
          return;
        }
        throw e2;
      }
      return;
    }
    throw e;
  }
}

export default { migrateDeployWithRepair };
