import { execSync } from 'node:child_process';
import type { ExecSyncOptions } from 'node:child_process';
import type { MigrationRunOptions, MigrationResult } from '../web/src/server/db/migrations';

const defaultShell = process.platform === 'win32' ? process.env.ComSpec ?? 'cmd.exe' : '/bin/sh';
const migrationNamePattern = /^\d{6,}[_-]/;

function withDefaults(options: MigrationRunOptions): ExecSyncOptions {
  const env = {
    ...process.env,
    DATABASE_URL: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
    ...(options.env ?? {}),
  };

  return {
    stdio: ['pipe', 'pipe', 'pipe'],
    encoding: 'utf8',
    cwd: options.cwd,
    shell: defaultShell,
    env,
  } satisfies ExecSyncOptions;
}

function run(command: string, options: MigrationRunOptions) {
  const execOptions = withDefaults(options);
  return execSync(command, execOptions);
}

function parsePendingMigrations(output: string): string[] {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(
      (line) =>
        line &&
        !/^migration_name/i.test(line) &&
        !/^started_at/i.test(line) &&
        !/^finished_at/i.test(line) &&
        !/^rolled_back_at/i.test(line) &&
        !/^[-()]+$/.test(line) &&
        !/^\d+\s+rows?/i.test(line) &&
        migrationNamePattern.test(line)
    );
}

function logCaptured(output: string, logger: ((message: string) => void) | undefined) {
  if (!output || !logger) return;
  for (const line of output.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    logger(trimmed);
  }
}

function runDbPush(options: MigrationRunOptions, log: MigrationRunOptions['log']) {
  const output = run('pnpm prisma db push --accept-data-loss', options);
  logCaptured(output, log?.warn?.bind(log) ?? console.warn);
  (log?.log ?? console.log)('[migrate] prisma db push --accept-data-loss: OK');
}

export async function runFallback(options: MigrationRunOptions): Promise<MigrationResult> {
  const log = options.log ?? console;

  try {
    const output = run('pnpm prisma migrate deploy', options);
    logCaptured(output, log.log?.bind(log));
    log.log?.('[migrate] prisma migrate deploy: OK');
    return {
      appliedMigrations: [],
      repairedMigrations: [],
      fallbackToPush: false,
      skipped: false,
    };
  } catch (err) {
    const error = err as Error & { stdout?: Buffer; stderr?: Buffer };
    const stdout = error.stdout?.toString('utf8') ?? '';
    const stderr = error.stderr?.toString('utf8') ?? '';
    logCaptured(stdout, log.warn?.bind(log));
    logCaptured(stderr, log.warn?.bind(log));
    const combined = `${stdout}\n${stderr}\n${error.message ?? ''}`;

    if (!/P3009/.test(combined)) {
      if (options.allowPreviewFallback) {
        log.warn?.('[migrate] fallback to prisma db push (preview only)');
        runDbPush(options, log);
        return {
          appliedMigrations: [],
          repairedMigrations: [],
          fallbackToPush: true,
          skipped: false,
        };
      }
      throw error;
    }

    log.warn?.('[repair] detected Prisma error P3009, attempting automatic repair');

    const sql = `SELECT migration_name\nFROM "_prisma_migrations"\nWHERE finished_at IS NULL AND rolled_back_at IS NULL\nORDER BY started_at ASC;`;
    const pendingOutput = execSync('pnpm prisma db execute --stdin', {
      ...withDefaults(options),
      input: sql,
    });

    const pending = parsePendingMigrations(pendingOutput);
    for (const name of pending) {
      log.warn?.(`[repair] rolled-back ${name}`);
      execSync(`pnpm prisma migrate resolve --rolled-back ${name}`, withDefaults(options));
    }

    try {
      const rerunOutput = run('pnpm prisma migrate deploy', options);
      logCaptured(rerunOutput, log.log?.bind(log));
      log.log?.('[migrate] prisma migrate deploy: OK');
      return {
        appliedMigrations: [],
        repairedMigrations: pending,
        fallbackToPush: false,
        skipped: false,
      };
    } catch (retryError) {
      if (options.allowPreviewFallback) {
        log.warn?.('[migrate] retry after repair failed, falling back to prisma db push (preview only)');
        runDbPush(options, log);
        return {
          appliedMigrations: [],
          repairedMigrations: pending,
          fallbackToPush: true,
          skipped: false,
        };
      }
      throw retryError;
    }
  }
}
