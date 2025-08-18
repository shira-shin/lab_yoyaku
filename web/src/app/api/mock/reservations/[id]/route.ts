import { NextResponse } from 'next/server';
import { updateReservation, deleteReservation } from '@/lib/mock-db';

export async function PATCH(req: Request, { params: { id } }: { params: { id: string } }) {
  const patch = await req.json();
  const updated = updateReservation(id, patch);
  if (!updated)
    return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
  return NextResponse.json({ ok: true, data: updated });
}

export async function DELETE(
  _req: Request,
  { params: { id } }: { params: { id: string } }
) {
  deleteReservation(id);
  return NextResponse.json({ ok: true });
}

