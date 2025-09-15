export const runtime = 'nodejs'

import { prisma } from '@/src/lib/prisma'

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return Response.json({ ok: true })
  } catch (e) {
    return new Response('db NG', { status: 500 })
  }
}
