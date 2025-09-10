import { prisma } from '@/src/lib/prisma'
export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const { name, slug, userId } = await req.json()
    const group = await prisma.group.create({
      data: { name, slug, createdBy: userId ?? null },
      select: { id: true, name: true, slug: true }
    })
    return Response.json(group, { status: 201 })
  } catch (e) {
    console.error('create group failed', e)
    return Response.json({ error: 'create group failed' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const groups = await prisma.group.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, slug: true, createdAt: true }
    })
    return Response.json(groups, { status: 200 })
  } catch (e) {
    console.error('list groups failed', e)
    return Response.json({ error: 'list groups failed' }, { status: 500 })
  }
}
