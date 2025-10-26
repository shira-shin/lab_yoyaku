'use server';

import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

import { PrismaClient } from '@prisma/client';

export type MigrationLogLevel = 'info' | 'warn' | 'error';
export interface MigrationLogEntry {
  scope: string;
  level: MigrationLogLevel;
  message: string;
}

export type MigrationLogger = (entry: MigrationLogEntry) => void;

export interface MigrationStats {
  pending: number;
  applied: number;
  rolledBack: number;
  total: number;
}

export interface CommandResult {
  status: number | null;
  stdout: string;
  stderr: string;
  error?: Error | null;
}

const requireFromModule = createRequire(import.meta.url);
const prismaPackagePath = requireFromModule.resolve('prisma/package.json');
const prismaCliPath = join(dirname(prismaPackagePath), 'build/index.js');

function emit(logger: MigrationLogger | undefined, entry: MigrationLogEntry) {
  if (!logger) {
    const printer = entry.level === 'error' ? console.error : entry.level === 'warn' ? console.warn : console.log;
    printer(`[${entry.scope}] ${entry.message}`);
    return;
  }

  logger(entry);
  const printer = entry.level === 'error' ? console.error : entry.level === 'warn' ? console.warn : console.log;
  printer(`[${entry.scope}] ${entry.message}`);
}

export function createArrayLogger(target: MigrationLogEntry[]): MigrationLogger {
  return (entry) => {
    target.push(entry);
  };
}

export function createLogEmitter(scope: string, logger?: MigrationLogger) {
  return {
    info(message: string) {
      emit(logger, { scope, level: 'info', message });
    },
    warn(message: string) {
      emit(logger, { scope, level: 'warn', message });
    },
    error(message: string) {
      emit(logger, { scope, level: 'error', message });
    },
  };
}

export function createPrismaClient(options?: { url?: string }) {
  if (options?.url) {
    return new PrismaClient({ datasources: { db: { url: options.url } } });
  }
  return new PrismaClient();
}

function runPrismaCommand(
  args: string[],
  options?: { env?: Partial<NodeJS.ProcessEnv>; cwd?: string },
): Promise<CommandResult> {
  const env = { ...process.env, ...options?.env, PRISMA_HIDE_UPDATE_MESSAGE: '1' };
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [prismaCliPath, ...args], {
      cwd: options?.cwd ?? process.cwd(),
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (chunk) => {
      const text = chunk.toString();
      stdout += text;
      process.stdout.write(text);
    });

    child.stderr?.on('data', (chunk) => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(text);
    });

    child.on('error', (error) => {
      resolve({ status: null, stdout, stderr, error });
    });

    child.on('close', (code) => {
      resolve({ status: code, stdout, stderr, error: null });
    });
  });
}

function hasErrorCode(result: CommandResult, code: string) {
  return result.stdout.includes(code) || result.stderr.includes(code);
}

function isMissingMigrationsTable(error: unknown) {
  if (typeof error !== 'object' || !error) return false;
  const message = 'message' in error ? String((error as { message?: unknown }).message ?? '') : '';
  return message.includes('_prisma_migrations') && message.includes('does not exist');
}

export async function fetchMigrationStats(prisma: PrismaClient): Promise<MigrationStats> {
  try {
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT
        COUNT(*) FILTER (WHERE finished_at IS NULL AND rolled_back_at IS NULL) AS pending,
        COUNT(*) FILTER (WHERE finished_at IS NOT NULL) AS applied,
        COUNT(*) FILTER (WHERE rolled_back_at IS NOT NULL) AS rolled_back
      FROM _prisma_migrations`,
    )) as {
      pending: bigint;
      applied: bigint;
      rolled_back: bigint;
    }[];
    const [row] = rows;
    const pending = Number(row?.pending ?? 0n);
    const applied = Number(row?.applied ?? 0n);
    const rolledBack = Number(row?.rolled_back ?? 0n);
    return { pending, applied, rolledBack, total: pending + applied + rolledBack };
  } catch (error) {
    if (isMissingMigrationsTable(error)) {
      return { pending: 0, applied: 0, rolledBack: 0, total: 0 };
    }
    throw error;
  }
}

async function listOpenMigrations(prisma: PrismaClient): Promise<string[]> {
  try {
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT migration_name
       FROM _prisma_migrations
       WHERE finished_at IS NULL AND rolled_back_at IS NULL
       ORDER BY started_at`,
    )) as { migration_name: string }[];
    return rows.map((row) => row.migration_name);
  } catch (error) {
    if (isMissingMigrationsTable(error)) {
      return [];
    }
    throw error;
  }
}

async function resolveRolledBackMigrations(
  prisma: PrismaClient,
  env: Partial<NodeJS.ProcessEnv> | undefined,
  logger: ReturnType<typeof createLogEmitter>,
): Promise<string[]> {
  const openMigrations = await listOpenMigrations(prisma);
  if (!openMigrations.length) {
    logger.info('no unfinished migrations to repair');
    return [];
  }

  for (const name of openMigrations) {
    const result = await runPrismaCommand(['migrate', 'resolve', '--rolled-back', name], { env });
    if (result.status !== 0) {
      const error = new Error(`Failed to resolve migration ${name}: exit code ${result.status}`);
      logger.error(error.message);
      throw error;
    }
    logger.info(`rolled-back ${name}`);
  }

  return openMigrations;
}

export interface MigrateDeployResult {
  ok: boolean;
  repaired: boolean;
  rolledBackMigrations: string[];
  fallbackToDbPush: boolean;
  statsBefore: MigrationStats;
  statsAfter: MigrationStats;
  error?: string;
  commandResult?: CommandResult;
}

export interface MigrateDeployOptions {
  prisma: PrismaClient;
  env?: Partial<NodeJS.ProcessEnv>;
  allowPreviewFallback?: boolean;
  logger?: MigrationLogger;
  cwd?: string;
}

export async function migrateDeployWithRepair(options: MigrateDeployOptions): Promise<MigrateDeployResult> {
  const { prisma, allowPreviewFallback, logger, cwd } = options;
  const env = { ...process.env, ...options.env };
  const migrateLogger = createLogEmitter('migrate', logger);
  const repairLogger = createLogEmitter('repair', logger);
  const statsBefore = await fetchMigrationStats(prisma);

  const firstAttempt = await runPrismaCommand(['migrate', 'deploy'], { env, cwd });
  if (firstAttempt.status === 0) {
    migrateLogger.info('prisma migrate deploy: OK');
    const statsAfter = await fetchMigrationStats(prisma);
    return {
      ok: true,
      repaired: false,
      rolledBackMigrations: [],
      fallbackToDbPush: false,
      statsBefore,
      statsAfter,
      commandResult: firstAttempt,
    };
  }

  if (hasErrorCode(firstAttempt, 'P3009')) {
    repairLogger.warn('Detected P3009 during migrate deploy; attempting automatic repair');
    const repaired = await resolveRolledBackMigrations(prisma, env, repairLogger);
    if (!repaired.length) {
      repairLogger.info('No migrations repaired; re-running migrate deploy');
    }
    const secondAttempt = await runPrismaCommand(['migrate', 'deploy'], { env, cwd });
    if (secondAttempt.status === 0) {
      migrateLogger.info('prisma migrate deploy: OK');
      const statsAfter = await fetchMigrationStats(prisma);
      return {
        ok: true,
        repaired: true,
        rolledBackMigrations: repaired,
        fallbackToDbPush: false,
        statsBefore,
        statsAfter,
        commandResult: secondAttempt,
      };
    }

    const errorMessage = `prisma migrate deploy failed after repair (exit code ${secondAttempt.status})`;
    migrateLogger.error(errorMessage);
    return {
      ok: false,
      repaired: true,
      rolledBackMigrations: repaired,
      fallbackToDbPush: false,
      statsBefore,
      statsAfter: await fetchMigrationStats(prisma).catch(() => statsBefore),
      error: errorMessage,
      commandResult: secondAttempt,
    };
  }

  if (allowPreviewFallback) {
    migrateLogger.warn('migrate deploy failed; falling back to prisma db push (preview only)');
    const pushResult = await runPrismaCommand(['db', 'push', '--accept-data-loss'], { env, cwd });
    if (pushResult.status === 0) {
      migrateLogger.info('prisma db push: OK');
      const statsAfter = await fetchMigrationStats(prisma);
      return {
        ok: true,
        repaired: false,
        rolledBackMigrations: [],
        fallbackToDbPush: true,
        statsBefore,
        statsAfter,
        commandResult: pushResult,
      };
    }

    const errorMessage = `prisma db push failed during fallback (exit code ${pushResult.status})`;
    migrateLogger.error(errorMessage);
    return {
      ok: false,
      repaired: false,
      rolledBackMigrations: [],
      fallbackToDbPush: true,
      statsBefore,
      statsAfter: await fetchMigrationStats(prisma).catch(() => statsBefore),
      error: errorMessage,
      commandResult: pushResult,
    };
  }

  const errorMessage = `prisma migrate deploy failed (exit code ${firstAttempt.status})`;
  migrateLogger.error(errorMessage);
  return {
    ok: false,
    repaired: false,
    rolledBackMigrations: [],
    fallbackToDbPush: false,
    statsBefore,
    statsAfter: await fetchMigrationStats(prisma).catch(() => statsBefore),
    error: errorMessage,
    commandResult: firstAttempt,
  };
}
