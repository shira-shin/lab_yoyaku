import { NextResponse } from 'next/server';
import { mockDB, insertGroup } from '@/lib/mock-db';

const publicGroup = (g: any) => {
  const { passwordHash, ...rest } = g;
  return rest;
};

export async function GET() {
  return NextResponse.json({ ok: true, data: mockDB.groups.map(publicGroup) });
}

export async function POST(req: Request) {
  const { name, slug, password } = await req.json();
  if (!name || !slug || !password)
    return NextResponse.json(
      { ok: false, error: 'name, slug, password are required' },
      { status: 400 }
    );
  try {
    const group = await insertGroup({ name, slug, password });
    return NextResponse.json({ ok: true, data: publicGroup(group) }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
  }
}

