import { execSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

const REQUIRED_TABLES = ['User', 'Group', 'GroupMember', 'Reservation'] as const;
const ADVISORY_LOCK_KEY = [48_151, 62_342] as const;

export type TableName = (typeof REQUIRED_TABLES)[number];
export type TableStatus = { name: TableName; exists: boolean };

export type DbInitializationSnapshot = {
  tables: TableStatus[];
  uninitialized: boolean;
};

export type DbBootstrapResult = {
  ok: boolean;
  attempted: boolean;
  lockAcquired: boolean;
  reason: string;
  skippedReason?: string;
  tablesBefore: TableStatus[];
  tablesAfter: TableStatus[];
  error?: { name: string; message: string } | null;
};

type TableCheckRow = Record<TableName, string | null>;

type GlobalWithEnsure = typeof globalThis & {
  __ensureDbInitPromise?: Promise<void> | null;
  __ensureDbInitDone?: boolean;
};

const globalForEnsure = globalThis as GlobalWithEnsure;

function isPreviewEnvironment() {
  return process.env.VERCEL_ENV === 'preview';
}

function canRuntimeBootstrap() {
  return process.env.ALLOW_RUNTIME_BOOTSTRAP === '1' && isPreviewEnvironment();
}

async function withPrismaClient<T>(fn: (client: PrismaClient) => Promise<T>): Promise<T> {
  const client = new PrismaClient({ log: [] });
  try {
    return await fn(client);
  } finally {
    await client.$disconnect().catch(() => {
      // noop
    });
  }
}

async function fetchTableStatuses(client: PrismaClient): Promise<TableStatus[]> {
  const columns = REQUIRED_TABLES.map(
    (name) => `to_regclass('public."${name}"')::text AS "${name}"`,
  ).join(', ');
  try {
    const result = (await client.$queryRawUnsafe(`SELECT ${columns}`)) as TableCheckRow[] | undefined;
    const row = result?.[0];
    if (!row) {
      return REQUIRED_TABLES.map((name) => ({ name, exists: false }));
    }
    return REQUIRED_TABLES.map((name) => ({ name, exists: Boolean(row[name]) }));
  } catch (error) {
    console.warn('[bootstrap] failed to check table statuses', error);
    return REQUIRED_TABLES.map((name) => ({ name, exists: false }));
  }
}

function allTablesMissing(statuses: TableStatus[]): boolean {
  return statuses.every((status) => !status.exists);
}

async function tryAcquireLock(client: PrismaClient): Promise<boolean> {
  const [key1, key2] = ADVISORY_LOCK_KEY;
  const rows = (await client.$queryRawUnsafe(
    `SELECT pg_try_advisory_lock(${key1}, ${key2}) AS "locked"`,
  )) as { locked: boolean }[] | undefined;
  return Boolean(rows?.[0]?.locked);
}

async function releaseLock(client: PrismaClient): Promise<void> {
  const [key1, key2] = ADVISORY_LOCK_KEY;
  await client
    .$queryRawUnsafe(`SELECT pg_advisory_unlock(${key1}, ${key2})`)
    .catch(() => {
      // noop
    });
}

function serializeError(error: unknown): { name: string; message: string } {
  if (error instanceof Error) {
    return { name: error.name, message: error.message };
  }
  return { name: 'Error', message: String(error) };
}

function runPrismaDbPush() {
  const env = { ...process.env };
  if (process.env.DIRECT_URL) {
    env.DATABASE_URL = process.env.DIRECT_URL;
  } else {
    console.warn('[bootstrap] DIRECT_URL is not set; using DATABASE_URL');
  }
  console.warn('[bootstrap] running prisma db push --accept-data-loss (runtime)');
  execSync('prisma db push --accept-data-loss', {
    stdio: 'inherit',
    env,
  });
  console.log('[bootstrap] prisma db push: OK (runtime)');
}

async function bootstrapInternal(reason: string, force: boolean): Promise<DbBootstrapResult> {
  return withPrismaClient(async (client) => {
    const initial = await fetchTableStatuses(client);
    const uninitialized = allTablesMissing(initial);

    if (!uninitialized) {
      return {
        ok: true,
        attempted: false,
        lockAcquired: false,
        reason,
        skippedReason: 'already-initialized',
        tablesBefore: initial,
        tablesAfter: initial,
        error: null,
      };
    }

    console.warn('[bootstrap] detected uninitialized database', {
      reason,
      tablesMissing: initial.filter((s) => !s.exists).map((s) => s.name),
    });

    if (!force && !canRuntimeBootstrap()) {
      console.warn('[bootstrap] runtime bootstrap disabled', {
        reason,
        allowRuntimeBootstrap: process.env.ALLOW_RUNTIME_BOOTSTRAP,
        vercelEnv: process.env.VERCEL_ENV,
      });
      return {
        ok: false,
        attempted: false,
        lockAcquired: false,
        reason,
        skippedReason: 'runtime-bootstrap-disabled',
        tablesBefore: initial,
        tablesAfter: initial,
        error: null,
      };
    }

    if (!isPreviewEnvironment()) {
      console.warn('[bootstrap] preview-only safeguard triggered; skipping', { reason });
      return {
        ok: false,
        attempted: false,
        lockAcquired: false,
        reason,
        skippedReason: 'not-preview',
        tablesBefore: initial,
        tablesAfter: initial,
        error: null,
      };
    }

    const lockAcquired = await tryAcquireLock(client);
    if (!lockAcquired) {
      console.warn('[bootstrap] advisory lock busy; skip runtime bootstrap', { reason });
      const after = await fetchTableStatuses(client);
      return {
        ok: false,
        attempted: false,
        lockAcquired: false,
        reason,
        skippedReason: 'lock-busy',
        tablesBefore: initial,
        tablesAfter: after,
        error: null,
      };
    }

    let tablesBeforePush = await fetchTableStatuses(client);
    if (!allTablesMissing(tablesBeforePush)) {
      await releaseLock(client);
      return {
        ok: true,
        attempted: false,
        lockAcquired: true,
        reason,
        skippedReason: 'already-initialized',
        tablesBefore: tablesBeforePush,
        tablesAfter: tablesBeforePush,
        error: null,
      };
    }

    let pushError: { name: string; message: string } | null = null;
    try {
      runPrismaDbPush();
    } catch (error) {
      pushError = serializeError(error);
      console.error('[bootstrap] prisma db push failed', { reason, error: pushError });
    }

    let tablesAfter: TableStatus[] = tablesBeforePush;
    try {
      tablesAfter = await fetchTableStatuses(client);
    } finally {
      await releaseLock(client);
    }

    const ok = !pushError && !allTablesMissing(tablesAfter);
    const skippedReason = pushError
      ? 'push-error'
      : ok
        ? undefined
        : 'tables-still-missing';
    if (ok) {
      console.log('[bootstrap] runtime bootstrap completed', { reason });
    } else if (!pushError) {
      console.warn('[bootstrap] runtime bootstrap finished but tables still missing', {
        reason,
        tablesMissing: tablesAfter.filter((s) => !s.exists).map((s) => s.name),
      });
    }

    return {
      ok,
      attempted: true,
      lockAcquired: true,
      reason,
      skippedReason,
      tablesBefore: tablesBeforePush,
      tablesAfter,
      error: pushError,
    };
  });
}

export function ensureDbInitialized(): Promise<void> {
  if (globalForEnsure.__ensureDbInitDone) {
    return Promise.resolve();
  }

  if (!globalForEnsure.__ensureDbInitPromise) {
    globalForEnsure.__ensureDbInitPromise = bootstrapInternal('runtime.ensure', false)
      .catch((error) => {
        console.error('[bootstrap] ensure failed', error);
      })
      .finally(() => {
        globalForEnsure.__ensureDbInitDone = true;
        globalForEnsure.__ensureDbInitPromise = null;
      })
      .then(() => undefined);
  }

  return globalForEnsure.__ensureDbInitPromise ?? Promise.resolve();
}

export async function getDbInitializationSnapshot(): Promise<DbInitializationSnapshot> {
  return withPrismaClient(async (client) => {
    const tables = await fetchTableStatuses(client);
    return { tables, uninitialized: allTablesMissing(tables) };
  });
}

export async function bootstrapDatabase(reason: string, options?: { force?: boolean }): Promise<DbBootstrapResult> {
  return bootstrapInternal(reason, Boolean(options?.force));
}

