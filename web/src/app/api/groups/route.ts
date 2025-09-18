export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { prisma } from '@/src/lib/prisma'
import { readUserFromCookie, hashPassword } from '@/lib/auth'
import { makeSlug } from '@/lib/slug'
import type { Prisma } from '@prisma/client'

function parseDate(value: unknown) {
  if (!value) return null
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const mine = url.searchParams.get('mine') === '1'

    if (mine) {
      const me = await readUserFromCookie()
      console.info('[api.groups.GET]', {
        mine: true,
        hasUserId: Boolean(me?.id),
        hasEmail: Boolean(me?.email),
      })
      if (!me?.email) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
      }
      const memberships = await prisma.groupMember.findMany({
        where: { email: me.email },
        select: { groupId: true },
      })
      const groupIds = memberships.map((m) => m.groupId)
      const groups = await prisma.group.findMany({
        where: {
          OR: [{ hostEmail: me.email }, groupIds.length ? { id: { in: groupIds } } : undefined].filter(
            Boolean
          ) as Prisma.GroupWhereInput[],
        },
        orderBy: { createdAt: 'desc' },
        select: { slug: true, name: true },
      })
      return NextResponse.json({ groups })
    }

    const groups = await prisma.group.findMany({
      orderBy: { createdAt: 'desc' },
      select: { slug: true, name: true },
    })
    console.info('[api.groups.GET]', {
      mine: false,
      hasUserId: false,
      hasEmail: false,
    })
    return NextResponse.json({ groups })
  } catch (error) {
    console.error('list groups failed', error)
    return NextResponse.json({ error: 'list groups failed' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const me = await readUserFromCookie()
    console.info('[api.groups.POST]', {
      hasUserId: Boolean(me?.id),
      hasEmail: Boolean(me?.email),
    })
    if (!me?.email) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'invalid body' }, { status: 400 })
    }

    const name = String((body as any).name || '').trim()
    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    const providedSlug = String((body as any).slug || '')
    const slug = makeSlug(providedSlug || name)

    const existing = await prisma.group.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json({ error: 'slug already exists' }, { status: 409 })
    }

    const passwordRaw = String((body as any).password || '')
    const passcode = passwordRaw ? hashPassword(passwordRaw) : null
    const reserveFrom = parseDate((body as any).startAt)
    const reserveTo = parseDate((body as any).endAt)
    const memoValue = String((body as any).memo || '').trim()

    const created = await prisma.group.create({
      data: {
        slug,
        name,
        passcode,
        hostEmail: me.email,
        reserveFrom,
        reserveTo,
        memo: memoValue || null,
        members: { create: { email: me.email } },
      },
      select: { id: true, slug: true, name: true },
    })

    return NextResponse.json({ group: created }, { status: 201 })
  } catch (error) {
    console.error('create group failed', error)
    return NextResponse.json({ error: 'create group failed' }, { status: 500 })
  }
}
