import { NextResponse } from 'next/server'
import { prisma } from '@/server/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type HealthCheckRow = {
  now: Date
  db: string
  version: string
  user_table: string | null
}

export async function GET() {
  try {
    const rows = await prisma.$queryRaw<HealthCheckRow[]>`
      SELECT
        NOW() AS now,
        current_database() AS db,
        version() AS version,
        (
          SELECT tablename::text
          FROM pg_catalog.pg_tables
          WHERE schemaname = 'public' AND tablename = 'User'
          LIMIT 1
        ) AS user_table
    `

    const row = rows?.[0]
    const ok = !!row

    return NextResponse.json({ ok, ...row }, { status: 200 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    )
  }
}
