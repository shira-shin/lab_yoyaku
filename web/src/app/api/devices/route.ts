export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { readUserFromCookie } from '@/lib/auth'
import { prisma } from '@/src/lib/prisma'

const QuerySchema = z.object({
  groupSlug: z.string().min(1),
})

export async function GET(req: Request) {
  try {
    const me = await readUserFromCookie()
    if (!me?.email) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const url = new URL(req.url)
    const parsed = QuerySchema.safeParse({
      groupSlug: url.searchParams.get('groupSlug') ?? '',
    })

    if (!parsed.success) {
      const flattened = 'error' in parsed ? parsed.error.flatten() : { formErrors: ['invalid query'], fieldErrors: {} }
      return NextResponse.json({ error: flattened }, { status: 400 })
    }

    const slug = parsed.data.groupSlug.toLowerCase()
    const group = await prisma.group.findUnique({
      where: { slug },
      include: { members: true },
    })

    if (!group) {
      return NextResponse.json({ error: 'group not found' }, { status: 404 })
    }

    const isMember =
      group.hostEmail === me.email ||
      group.members.some((member) => member.email === me.email)

    if (!isMember) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const devices = await prisma.device.findMany({
      where: { groupId: group.id },
      orderBy: { name: 'asc' },
      select: { id: true, slug: true, name: true, caution: true, code: true },
    })

    return NextResponse.json({ devices })
  } catch (error) {
    console.error('list devices failed', error)
    return NextResponse.json({ error: 'list devices failed' }, { status: 500 })
  }
}
