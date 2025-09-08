import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { name, slug, userId } = await req.json();
    const id = `g-${Math.random().toString(36).slice(2, 10)}`;
    await sql`
      INSERT INTO groups (id, name, slug, created_by)
      VALUES (${id}, ${name}, ${slug}, ${userId ?? null})
    `;
    return NextResponse.json({ id, name, slug }, { status: 201 });
  } catch (e) {
    console.error('create group failed', e);
    return NextResponse.json({ error: 'create group failed' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { rows } = await sql`
      SELECT id, name, slug, created_at
      FROM groups
      ORDER BY created_at DESC
    `;
    return NextResponse.json(rows, { status: 200 });
  } catch (e) {
    console.error('list groups failed', e);
    return NextResponse.json({ error: 'list groups failed' }, { status: 500 });
  }
}
