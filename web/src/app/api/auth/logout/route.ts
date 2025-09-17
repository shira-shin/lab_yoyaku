import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth';

export const runtime = 'nodejs';

async function doLogout(request: Request) {
  const res = NextResponse.redirect(new URL('/login', request.url));
  res.cookies.set(clearSessionCookie());
  return res;
}

export async function GET(request: Request)  { return doLogout(request); }
export async function POST(request: Request) { return doLogout(request); }

