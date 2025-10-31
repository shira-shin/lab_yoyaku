import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { SESSION_COOKIE_NAME } from './src/lib/auth/cookies';

const SESSION_COOKIE = SESSION_COOKIE_NAME;
const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/signup',
  '/reset-password',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/debug',
  '/api/debug/',
  '/api/cookies/delete',
  '/api/health',
  '/favicon.ico',
];
const CANONICAL_HOST = 'labyoyaku.vercel.app';

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => {
    if (pathname === path) return true;
    if (path.endsWith('/')) {
      return pathname.startsWith(path);
    }
    return pathname.startsWith(`${path}/`);
  });
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

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/|static/|public/|favicon\\.).*)'],
};
