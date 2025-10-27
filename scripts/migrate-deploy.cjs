const { execSync } = require('node:child_process');

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: 'inherit', shell: true, ...opts });
}

const env = process.env.VERCEL_ENV || '';
if (env !== 'production' && process.env.MIGRATE_ON_PREVIEW !== '1') {
  console.log('[migrate] Skip on non-production');
  process.exit(0);
}

console.log('[migrate] using DIRECT_URL as DATABASE_URL for migrations');
process.env.DATABASE_URL = process.env.DIRECT_URL;

run('node scripts/codex-preflight.cjs');
run('pnpm --filter lab_yoyaku-web exec prisma migrate deploy');
