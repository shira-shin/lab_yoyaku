import { execSync } from 'node:child_process';
import path from 'node:path';

// このファイルは web/ 内にあるので web ルートを相対で辿る
const webRoot = path.resolve(__dirname, '../../../');

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
  execSync(cmd, { stdio: 'inherit', cwd: webRoot, env: env as NodeJS.ProcessEnv });
}

export async function migrateDeployWithRepair() {
  try {
    run('pnpm --filter lab_yoyaku-web exec prisma migrate deploy');
    console.log('[web:migrate] prisma migrate deploy: OK');
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    console.warn('[web:migrate] deploy failed:', msg);
    if (/P3009/.test(msg)) {
      // 失敗マイグレーション名は status から取得（より安定）
      try {
        const json = execSync('pnpm --filter lab_yoyaku-web exec prisma migrate status --json', {
          stdio: ['ignore', 'pipe', 'pipe'],
          cwd: webRoot,
          env: buildMigrateEnv() as NodeJS.ProcessEnv,
        }).toString();
        const info = JSON.parse(json);
        const failed: string | undefined = info?.failedMigrationNames?.[0];
        if (failed) {
          console.warn(`[web:migrate] resolve --rolled-back "${failed}"`);
          run(`pnpm --filter lab_yoyaku-web exec prisma migrate resolve --rolled-back "${failed}"`);
        }
      } catch {}

      try {
        run('pnpm --filter lab_yoyaku-web exec prisma migrate deploy');
        console.log('[web:migrate] prisma migrate deploy: OK (after resolve)');
      } catch (e2: any) {
        console.warn('[web:migrate] deploy retry failed:', e2?.message ?? String(e2));
        if (process.env.VERCEL_ENV === 'preview') {
          console.warn('[web:migrate] preview fallback: prisma db push --accept-data-loss');
          run('pnpm --filter lab_yoyaku-web exec prisma db push --accept-data-loss');
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

const migrationOps = { migrateDeployWithRepair };

export default migrationOps;
