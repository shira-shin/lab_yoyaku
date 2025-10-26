export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';

import { prisma } from '@/server/prisma';

type EndpointInfo = { endpoint: string | null; db: string; usr: string };

type TableStatus = {
  User: string | null;
  GroupMember: string | null;
  Reservation: string | null;
  PasswordResetToken: string | null;
};

export async function GET() {
  const info = await prisma.$queryRawUnsafe<EndpointInfo[]>(`
    SELECT current_setting('neon.endpoint_id', true) AS endpoint,
           current_database() AS db,
           current_user       AS usr
  `);

  const tables = await prisma.$queryRawUnsafe<TableStatus[]>(`
    SELECT
      to_regclass('public."User"')                AS "User",
      to_regclass('public."GroupMember"')         AS "GroupMember",
      to_regclass('public."Reservation"')         AS "Reservation",
      to_regclass('public."PasswordResetToken"')  AS "PasswordResetToken"
  `);

  return NextResponse.json({ info: info?.[0], tables: tables?.[0] });
}
