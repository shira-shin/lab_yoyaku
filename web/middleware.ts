import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import * as jose from 'jose';

const SESSION_COOKIE = process.env.APP_SESSION_COOKIE_NAME ?? 'lab_session';
const PUBLIC_PATHS = ['/', '/login', '/signup'];
const PUBLIC_PREFIXES = [
  '/api/auth',
  '/api/health',
  '/_next',
  '/favicon',
  '/robots',
  '/sitemap',
];
const CANONICAL_HOST = 'labyoyaku.vercel.app';
const secret = new TextEncoder().encode(process.env.APP_AUTH_SECRET || 'dev-secret');

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.includes(pathname)) {
    return true;
  }
  return PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (process.env.NODE_ENV === 'production') {
    const host = req.headers.get('host');
    if (host && host !== CANONICAL_HOST) {
      const url = new URL(req.url);
      url.host = CANONICAL_HOST;
      url.protocol = 'https:';
      return NextResponse.redirect(url);
    }
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    url.searchParams.set('next', pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  try {
    await jose.jwtVerify(token, secret);
    return NextResponse.next();
  } catch (error) {
    console.error('[auth] invalid token', error);
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    url.searchParams.set('next', pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ['/((?!_next|favicon.ico|api/health).*)'],
};
