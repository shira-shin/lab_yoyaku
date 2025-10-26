export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';

import {
  createArrayLogger,
  createPrismaClient,
  migrateDeployWithRepair,
  type MigrationLogEntry,
} from '@/server/db/migrations';
import { guardOpsAdminAccess } from '@/server/api/ops/db/admin-guard';

export async function POST() {
  const guard = await guardOpsAdminAccess({ feature: 'ops.db.repair' });
  if ('response' in guard) {
    return guard.response;
  }

  const directUrl = process.env.DIRECT_URL;
  if (!directUrl) {
    console.error('[ops.db.repair] DIRECT_URL is not configured');
    return NextResponse.json(
      {
        ok: false,
        viewer: { email: guard.email },
        error: 'missing_direct_url',
      },
      { status: 500 },
    );
  }

  const entries: MigrationLogEntry[] = [];
  const logger = createArrayLogger(entries);
  const prisma = createPrismaClient({ url: directUrl });

  try {
    const result = await migrateDeployWithRepair({
      prisma,
      logger,
      env: { ...process.env, DATABASE_URL: directUrl },
      allowPreviewFallback: process.env.VERCEL_ENV === 'preview',
    });

    const response = {
      ok: result.ok,
      viewer: { email: guard.email },
      repaired: result.repaired,
      rolledBack: result.rolledBackMigrations,
      fallbackToDbPush: result.fallbackToDbPush,
      statsBefore: result.statsBefore,
      statsAfter: result.statsAfter,
      logs: entries.map((entry) => ({ ...entry, text: `[${entry.scope}] ${entry.message}` })),
      error: result.error ?? null,
    };

    const status = result.ok ? 200 : 500;
    return NextResponse.json(response, { status });
  } catch (error) {
    console.error('[ops.db.repair] unexpected error', error);
    return NextResponse.json(
      {
        ok: false,
        viewer: { email: guard.email },
        repaired: false,
        rolledBack: [],
        fallbackToDbPush: false,
        statsBefore: null,
        statsAfter: null,
        logs: entries.map((entry) => ({ ...entry, text: `[${entry.scope}] ${entry.message}` })),
        error: error instanceof Error ? error.message : 'unknown_error',
      },
      { status: 500 },
    );
  } finally {
    await prisma.$disconnect();
  }
}
