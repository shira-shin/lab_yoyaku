import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth/cookies';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

function getBaseUrl(request: Request) {
  const requestUrl = new URL(request.url);

  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    requestUrl.origin
  );
}

function resolveLoginUrl(request: Request) {
  return new URL('/login', getBaseUrl(request));
}

async function doLogout(request: Request) {
  const res = NextResponse.redirect(resolveLoginUrl(request));
  clearSessionCookie(res);
  return res;
}

export async function GET(request: Request)  { return doLogout(request); }
export async function POST(request: Request) { return doLogout(request); }

