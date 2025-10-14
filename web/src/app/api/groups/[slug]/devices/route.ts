export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { normalizeEmail, readUserFromCookie } from '@/lib/auth-legacy'
import { makeSlug } from '@/lib/slug'
import { uuid } from '@/lib/uuid'

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  try {
    const me = await readUserFromCookie()
    if (!me?.email) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const slug = params.slug.toLowerCase()
    const group = await prisma.group.findUnique({
      where: { slug },
      include: { members: true },
    })
    if (!group) {
      return NextResponse.json({ error: 'group not found' }, { status: 404 })
    }

    const normalizedEmail = normalizeEmail(me.email)
    const isMember =
      normalizeEmail(group.hostEmail ?? '') === normalizedEmail ||
      group.members.some((member) => normalizeEmail(member.email) === normalizedEmail)
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

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  try {
    const me = await readUserFromCookie()
    if (!me?.email) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const slug = params.slug.toLowerCase()
    const group = await prisma.group.findUnique({
      where: { slug },
      include: { members: true },
    })
    if (!group) {
      return NextResponse.json({ error: 'group not found' }, { status: 404 })
    }

    const normalizedEmail = normalizeEmail(me.email)
    const canManage =
      group.deviceManagePolicy === 'MEMBERS_ALLOWED'
        ? normalizeEmail(group.hostEmail ?? '') === normalizedEmail ||
          group.members.some((member) => normalizeEmail(member.email) === normalizedEmail)
        : normalizeEmail(group.hostEmail ?? '') === normalizedEmail

    if (!canManage) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'invalid body' }, { status: 400 })
    }

    const name = String((body as any).name || '').trim()
    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    const slugRaw = String((body as any).slug || '').trim()
    const deviceSlug = makeSlug(slugRaw || name)
    const caution = String((body as any).caution || '').trim()
    const code = String((body as any).code || '').trim()

    const exists = await prisma.device.findFirst({ where: { groupId: group.id, slug: deviceSlug } })
    if (exists) {
      return NextResponse.json({ error: 'device slug already exists' }, { status: 409 })
    }

    const created = await prisma.device.create({
      data: {
        id: uuid(),
        slug: deviceSlug,
        name,
        caution: caution || null,
        code: code || null,
        groupId: group.id,
      },
      select: { id: true, slug: true, name: true, caution: true, code: true },
    })

    return NextResponse.json({ device: created }, { status: 201 })
  } catch (error) {
    console.error('create device failed', error)
    return NextResponse.json({ error: 'create device failed' }, { status: 500 })
  }
}
