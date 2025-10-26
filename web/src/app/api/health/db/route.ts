export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'

import { prisma } from '@/server/db/prisma'

type EndpointInfo = {
  endpoint: string | null
  db: string
  user: string
}

type TablePresence = {
  User: string | null
  GroupMember: string | null
  Reservation: string | null
  PasswordResetToken: string | null
}

export async function GET() {
  try {
    const info = await prisma.$queryRawUnsafe<EndpointInfo[]>(`
      SELECT
        current_setting('neon.endpoint_id', true) AS endpoint,
        current_database() AS db,
        current_user AS user
    `)

    const tables = await prisma.$queryRawUnsafe<TablePresence[]>(`
      SELECT
        to_regclass('public."User"') AS "User",
        to_regclass('public."GroupMember"') AS "GroupMember",
        to_regclass('public."Reservation"') AS "Reservation",
        to_regclass('public."PasswordResetToken"') AS "PasswordResetToken"
    `)

    return NextResponse.json({
      ok: true,
      info: info?.[0] ?? null,
      tables: tables?.[0] ?? null,
    })
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : `${e}`
    return NextResponse.json({ ok: false, error }, { status: 500 })
  }
}
