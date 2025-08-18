import { NextResponse } from 'next/server';
import { findGroupBySlug, findMembers, findDevices } from '@/lib/mock-db';

const publicGroup = (g: any) => {
  const { passwordHash, ...rest } = g;
  return rest;
};

export async function GET(
  _req: Request,
  { params: { slug } }: { params: { slug: string } }
) {
  const group = findGroupBySlug(slug);
  if (!group)
    return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
  const members = findMembers(group.id);
  const devices = findDevices(group.id);
  return NextResponse.json({
    ok: true,
    data: {
      ...publicGroup(group),
      members,
      devices,
      counts: { members: members.length, devices: devices.length },
    },
  });
}

