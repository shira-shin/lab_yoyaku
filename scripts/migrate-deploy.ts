import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { MigrationRunOptions } from '../web/src/server/db/migrations';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const webRoot = path.join(repoRoot, 'web');

async function main() {
  const shouldRun = process.env.RUN_MIGRATIONS === '1';
  if (!shouldRun) {
    console.log(
      '[migrate] skipped (RUN_MIGRATIONS=%s, VERCEL=%s, ALLOW_MIGRATE_ON_VERCEL=%s)',
      process.env.RUN_MIGRATIONS,
      process.env.VERCEL,
      process.env.ALLOW_MIGRATE_ON_VERCEL
    );
    return;
  }

  const allowOnVercel = process.env.VERCEL ? process.env.ALLOW_MIGRATE_ON_VERCEL === '1' : true;
  if (!allowOnVercel) {
    console.log('[migrate] skipped (RUN_MIGRATIONS=1 but ALLOW_MIGRATE_ON_VERCEL!=1 on Vercel)');
    return;
  }

  const options: MigrationRunOptions = {
    cwd: webRoot,
    allowPreviewFallback: process.env.VERCEL_ENV === 'preview',
  };

  try {
    const mod = await import(new URL('../web/src/server/db/migrations.ts', import.meta.url));
    const runner = mod.migrateDeployWithRepair ?? mod.default?.migrateDeployWithRepair;
    if (!runner) {
      throw new Error('migrateDeployWithRepair export not found');
    }
    await runner(options);
  } catch (error) {
    console.warn('[migrate] failed to load migrations helper, falling back:', error);
    const fallback = await import(new URL('./migrate-deploy.fallback.ts', import.meta.url));
    await fallback.runFallback(options);
  }
}

main().catch((error) => {
  console.error('[migrate] migrate-deploy failed:', error);
  process.exit(1);
});
