import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth/cookies';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

function resolveLoginUrl(request: Request) {
  const requestUrl = new URL(request.url);
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    `${requestUrl.protocol}//${requestUrl.host}` ??
    'http://localhost:3000';
  return new URL('/login', base);
}

async function doLogout(request: Request) {
  const res = NextResponse.redirect(resolveLoginUrl(request));
  clearSessionCookie(res);
  return res;
}

export async function GET(request: Request)  { return doLogout(request); }
export async function POST(request: Request) { return doLogout(request); }

