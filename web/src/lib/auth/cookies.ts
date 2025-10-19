import type { NextResponse } from 'next/server';

const COOKIE_NAME = process.env.APP_SESSION_COOKIE_NAME ?? 'lab_session';
export const SESSION_COOKIE_NAME = COOKIE_NAME;

export function setSessionCookie(
  res: NextResponse,
  token: string,
  maxAgeSec = 60 * 60 * 24 * 30,
) {
  res.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeSec,
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set({
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
