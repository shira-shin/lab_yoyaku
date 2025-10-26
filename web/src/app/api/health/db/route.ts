import { NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';

type DbInfoRow = { endpoint: string | null; db: string; usr: string }
type TableInfoRow = {
  User: string | null
  GroupMember: string | null
  Reservation: string | null
  PasswordResetToken: string | null
}

export async function GET() {
  const info = (await prisma.$queryRawUnsafe(`
    SELECT current_setting('neon.endpoint_id', true) AS endpoint,
           current_database() AS db,
           current_user       AS usr
  `)) as DbInfoRow[]

  const tables = (await prisma.$queryRawUnsafe(`
    SELECT
      to_regclass('public."User"')               AS "User",
      to_regclass('public."GroupMember"')        AS "GroupMember",
      to_regclass('public."Reservation"')        AS "Reservation",
      to_regclass('public."PasswordResetToken"') AS "PasswordResetToken"
  `)) as TableInfoRow[]

  return NextResponse.json({ info: info?.[0], tables: tables?.[0] });
}
