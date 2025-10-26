import { createPrismaClient, migrateDeployWithRepair } from '../web/src/server/db/migrations';

function logSkip(reason: string) {
  console.log(`[migrate] skipped: ${reason}`);
}

async function main() {
  const runMigrations = process.env.RUN_MIGRATIONS === '1';
  const isVercel = Boolean(process.env.VERCEL);
  const allowOnVercel = process.env.ALLOW_MIGRATE_ON_VERCEL === '1';

  if (!runMigrations) {
    logSkip(`RUN_MIGRATIONS=${process.env.RUN_MIGRATIONS ?? 'undefined'}`);
    return;
  }

  if (isVercel && !allowOnVercel) {
    logSkip(
      `VERCEL build detected but ALLOW_MIGRATE_ON_VERCEL=${process.env.ALLOW_MIGRATE_ON_VERCEL ?? 'undefined'}`,
    );
    return;
  }

  const prisma = createPrismaClient();

  try {
    const result = await migrateDeployWithRepair({
      prisma,
      allowPreviewFallback: process.env.VERCEL_ENV === 'preview',
    });

    if (!result.ok) {
      const message = result.error ?? 'prisma migrate deploy failed';
      throw new Error(message);
    }

    console.log(
      `[migrate] stats pending ${result.statsBefore.pending} -> ${result.statsAfter.pending}, applied ${result.statsBefore.applied} -> ${result.statsAfter.applied}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('[migrate] fatal error', error);
  process.exitCode = 1;
});
