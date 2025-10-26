import { execSync } from 'node:child_process';
import type { ExecSyncOptions } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface MigrationLogger {
  log?: (...args: unknown[]) => void;
  warn?: (...args: unknown[]) => void;
  error?: (...args: unknown[]) => void;
}

export interface MigrationRunOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  allowPreviewFallback?: boolean;
  log?: MigrationLogger;
}

export interface MigrationResult {
  appliedMigrations: string[];
  repairedMigrations: string[];
  fallbackToPush: boolean;
  skipped: boolean;
}

const webRoot = path.resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const defaultShell = process.platform === 'win32' ? process.env.ComSpec ?? 'cmd.exe' : '/bin/sh';
const migrationNamePattern = /^\d{6,}[_-]/;

function resolveCwd(options?: MigrationRunOptions): string {
  return options?.cwd ?? webRoot;
}

function resolveEnv(options?: MigrationRunOptions): NodeJS.ProcessEnv {
  const overrides = options?.env;
  const directUrl = overrides?.DIRECT_URL ?? process.env.DIRECT_URL;
  const databaseUrl = directUrl ?? overrides?.DATABASE_URL ?? process.env.DATABASE_URL;

  return {
    ...process.env,
    ...(overrides ?? {}),
    DATABASE_URL: databaseUrl,
  };
}

function exec(command: string, options?: MigrationRunOptions & { capture?: boolean; input?: string }) {
  const { capture = true, input } = options ?? {};
  const execOptions: ExecSyncOptions = {
    cwd: resolveCwd(options),
    env: resolveEnv(options),
    shell: defaultShell,
    stdio: capture ? ['pipe', 'pipe', 'pipe'] : 'inherit',
    encoding: capture ? 'utf8' : undefined,
    input,
  };

  return execSync(command, execOptions) as unknown as string;
}

function parseAppliedMigrations(output: string): string[] {
  const lines = output.split(/\r?\n/).map((line) => line.trim());
  const applied: string[] = [];
  for (const line of lines) {
    const match = line.match(/(?:Applying|Applied|Migration|migrate)\s+`?([\w-]+)`?/i);
    if (match && match[1]) {
      applied.push(match[1]);
    }
  }
  return Array.from(new Set(applied));
}

function parsePendingMigrations(output: string): string[] {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) =>
      line.length > 0 &&
      !/^migration_name/i.test(line) &&
      !/^started_at/i.test(line) &&
      !/^finished_at/i.test(line) &&
      !/^rolled_back_at/i.test(line) &&
      !/^[-()]+$/.test(line) &&
      !/^\d+\s+rows?$/i.test(line) &&
      migrationNamePattern.test(line)
    );
}

class PrismaMigrateError extends Error {
  stdout: string;
  stderr: string;
  exitCode?: number;

  constructor(message: string, stdout: string, stderr: string, exitCode?: number) {
    super(message);
    this.stdout = stdout;
    this.stderr = stderr;
    this.exitCode = exitCode;
  }

  get isP3009(): boolean {
    return /P3009/.test(this.stdout) || /P3009/.test(this.stderr) || /P3009/.test(this.message);
  }
}

function logCaptured(log: ((...args: unknown[]) => void) | undefined, output: string) {
  if (!log || !output) return;
  for (const line of output.split(/\r?\n/)) {
    if (line.trim().length === 0) continue;
    log(line);
  }
}

export async function migrateDeployOnly(options?: MigrationRunOptions): Promise<MigrationResult> {
  const logger = options?.log ?? console;

  try {
    const output = exec('pnpm prisma migrate deploy', options);
    logCaptured(logger.log, output);
    logger.log?.('[migrate] prisma migrate deploy: OK');
    return {
      appliedMigrations: parseAppliedMigrations(output),
      repairedMigrations: [],
      fallbackToPush: false,
      skipped: false,
    };
  } catch (error) {
    const execError = error as Error & { stdout?: Buffer; stderr?: Buffer; status?: number };
    const stdout = execError.stdout?.toString('utf8') ?? '';
    const stderr = execError.stderr?.toString('utf8') ?? '';
    logCaptured(logger.warn, stdout);
    logCaptured(logger.warn, stderr);
    logger.warn?.('[migrate] deploy failed:', execError.message);
    throw new PrismaMigrateError(execError.message ?? 'prisma migrate deploy failed', stdout, stderr, execError.status);
  }
}

export async function repairP3009Only(options?: MigrationRunOptions): Promise<{ repairedMigrations: string[] }> {
  const logger = options?.log ?? console;

  const sql = `SELECT migration_name\nFROM "_prisma_migrations"\nWHERE finished_at IS NULL AND rolled_back_at IS NULL\nORDER BY started_at ASC;`;
  const output = exec('pnpm prisma db execute --stdin', { ...options, input: sql });
  const pending = parsePendingMigrations(output);

  for (const name of pending) {
    logger.warn?.(`[repair] rolled-back ${name}`);
    exec(`pnpm prisma migrate resolve --rolled-back ${name}`, options);
  }

  return { repairedMigrations: pending };
}

async function prismaDbPush(options?: MigrationRunOptions) {
  const logger = options?.log ?? console;
  const output = exec('pnpm prisma db push --accept-data-loss', options);
  logCaptured(logger.warn, output);
  logger.log?.('[migrate] prisma db push --accept-data-loss: OK');
}

export async function migrateDeployWithRepair(options?: MigrationRunOptions): Promise<MigrationResult> {
  const logger = options?.log ?? console;
  if (process.env.RUN_MIGRATIONS !== '1') {
    logger.log?.(
      '[migrate] skipped (RUN_MIGRATIONS=%s, VERCEL=%s, ALLOW_MIGRATE_ON_VERCEL=%s)',
      process.env.RUN_MIGRATIONS,
      process.env.VERCEL,
      process.env.ALLOW_MIGRATE_ON_VERCEL
    );
    return {
      appliedMigrations: [],
      repairedMigrations: [],
      fallbackToPush: false,
      skipped: true,
    };
  }

  try {
    return await migrateDeployOnly(options);
  } catch (error) {
    if (error instanceof PrismaMigrateError && error.isP3009) {
      logger.warn?.('[repair] detected Prisma error P3009, attempting automatic repair');
      const { repairedMigrations } = await repairP3009Only(options);
      try {
        const result = await migrateDeployOnly(options);
        return {
          ...result,
          repairedMigrations,
        };
      } catch (retryError) {
        if (options?.allowPreviewFallback) {
          logger.warn?.('[migrate] retry after repair failed, falling back to prisma db push (preview only)');
          await prismaDbPush(options);
          return {
            appliedMigrations: [],
            repairedMigrations,
            fallbackToPush: true,
            skipped: false,
          };
        }
        throw retryError;
      }
    }

    if (options?.allowPreviewFallback) {
      logger.warn?.('[migrate] fallback to prisma db push (preview only)');
      await prismaDbPush(options);
      return {
        appliedMigrations: [],
        repairedMigrations: [],
        fallbackToPush: true,
        skipped: false,
      };
    }

    throw error;
  }
}

const defaultExport = {
  migrateDeployWithRepair,
  migrateDeployOnly,
  repairP3009Only,
};

export default defaultExport;
