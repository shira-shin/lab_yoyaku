import { NextResponse } from 'next/server';
import { MOCK_DEVICES } from '@/lib/mock';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ devices: MOCK_DEVICES });
}
