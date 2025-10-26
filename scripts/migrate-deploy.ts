import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { MigrationRunOptions } from '../web/src/server/db/migrations';

const repoRoot = path.resolve(__dirname, '..');
const webDir = path.resolve(repoRoot, 'web');

async function loadWebMigrations(): Promise<typeof import('../web/src/server/db/migrations')> {
  const filePath = path.resolve(webDir, 'src/server/db/migrations.ts');
  const url = pathToFileURL(filePath).href;
  return await import(url);
}

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

  const env = {
    ...process.env,
    DATABASE_URL: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  };

  const options: MigrationRunOptions = {
    cwd: webDir,
    env,
    allowPreviewFallback: process.env.VERCEL_ENV === 'preview',
  };

  try {
    const mod = await loadWebMigrations();
    const runner = mod.migrateDeployWithRepair ?? mod.default?.migrateDeployWithRepair;
    if (!runner) {
      throw new Error('migrateDeployWithRepair export not found');
    }
    await runner(options);
  } catch (error) {
    console.warn('[migrate] failed to load web migrations helper, use fallback:', (error as Error)?.message ?? error);
    const fallback = require('./migrate-deploy.fallback') as typeof import('./migrate-deploy.fallback');
    await fallback.runFallback(options);
  }
}

main().catch((error) => {
  console.error('[migrate] migrate-deploy failed:', error);
  process.exit(1);
});
