import { spawnSync } from 'node:child_process';

const directUrl = process.env.DIRECT_URL;

if (!directUrl) {
  throw new Error('[db-push-direct] Missing env: DIRECT_URL');
}

const result = spawnSync(
  'pnpm',
  [
    'prisma',
    'db',
    'push',
    '--skip-generate',
    '--accept-data-loss',
    '--force-reset',
    '--url',
    directUrl,
  ],
  { stdio: 'inherit' },
);

if (result.error) {
  throw result.error;
}

if (typeof result.status === 'number' && result.status !== 0) {
  process.exit(result.status);
}
