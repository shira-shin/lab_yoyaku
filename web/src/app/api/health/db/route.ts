import { NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';

export async function GET() {
  const info = await prisma.$queryRawUnsafe<{ endpoint: string | null; db: string; usr: string }[]>(`
    SELECT current_setting('neon.endpoint_id', true) AS endpoint,
           current_database() AS db,
           current_user       AS usr
  `);

  const tables = await prisma.$queryRawUnsafe<any[]>(`
    SELECT
      to_regclass('public."User"')               AS "User",
      to_regclass('public."GroupMember"')        AS "GroupMember",
      to_regclass('public."Reservation"')        AS "Reservation",
      to_regclass('public."PasswordResetToken"') AS "PasswordResetToken"
  `);

  if (info?.[0]) {
    console.info('[api.health.db] info', info[0]);
  }
  if (tables?.[0]) {
    console.info('[api.health.db] tables', tables[0]);
  }

  return NextResponse.json({ info: info?.[0], tables: tables?.[0] });
}
