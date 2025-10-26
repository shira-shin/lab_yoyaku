import { execSync } from 'node:child_process'
import { PrismaClient } from '@prisma/client'

const TABLES = ['Group', 'GroupMember', 'Reservation'] as const

type TableName = (typeof TABLES)[number]

type TableCheckRow = Record<TableName, string | null>

type GlobalWithSafeInit = typeof globalThis & {
  __safeDbInitPromise?: Promise<void> | null
  __safeDbInitDone?: boolean
}

const globalForSafeInit = globalThis as GlobalWithSafeInit

function canBootstrapAtRuntime() {
  return process.env.ALLOW_RUNTIME_BOOTSTRAP === '1' && process.env.VERCEL_ENV === 'preview'
}

async function detectMissingTables(): Promise<TableName[]> {
  const client = new PrismaClient({ log: [] })
  try {
    const result = (await client.$queryRawUnsafe(
      `SELECT ${TABLES.map((name) => `to_regclass('public."${name}"') AS "${name}"`).join(', ')}`
    )) as TableCheckRow[] | undefined

    const row = result?.[0]
    if (!row) return [...TABLES]

    return TABLES.filter((name) => row[name] === null)
  } catch (error) {
    console.warn('[db:init] table check failed', error)
    return [...TABLES]
  } finally {
    await client.$disconnect().catch(() => {
      // ignore
    })
  }
}

function runPrismaDbPush() {
  console.warn('[db:init] running prisma db push --accept-data-loss (runtime bootstrap)')
  execSync('prisma db push --accept-data-loss', {
    stdio: 'inherit',
  })
  console.log('[db:init] prisma db push: OK (runtime bootstrap)')
}

async function checkAndBootstrap() {
  const missing = await detectMissingTables()
  if (!missing.length) {
    return
  }

  const context = {
    missing,
    allowRuntimeBootstrap: process.env.ALLOW_RUNTIME_BOOTSTRAP,
    vercelEnv: process.env.VERCEL_ENV,
  }

  console.warn('[db:init] tables missing', context)

  if (!canBootstrapAtRuntime()) {
    console.warn('[db:init] runtime bootstrap skipped (disabled or non-preview)')
    return
  }

  try {
    runPrismaDbPush()
  } catch (error) {
    console.error('[db:init] prisma db push failed', error)
  }
}

export function ensureDbInitialized(): Promise<void> {
  if (globalForSafeInit.__safeDbInitDone) {
    return Promise.resolve()
  }

  if (!globalForSafeInit.__safeDbInitPromise) {
    globalForSafeInit.__safeDbInitPromise = checkAndBootstrap()
      .catch((error) => {
        console.error('[db:init] ensure failed', error)
      })
      .finally(() => {
        globalForSafeInit.__safeDbInitDone = true
        globalForSafeInit.__safeDbInitPromise = null
      })
  }

  return globalForSafeInit.__safeDbInitPromise ?? Promise.resolve()
}

