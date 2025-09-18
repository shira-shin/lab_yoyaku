import { cookies } from 'next/headers';

export const AUTH_COOKIE = process.env.NEXT_PUBLIC_AUTH_COOKIE_NAME ?? 'lab_session';

export function setSessionCookie(token: string, maxAgeSec = 60 * 60 * 24 * 30) {
  cookies().set({
    name: AUTH_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeSec,
  });
}

export function clearSessionCookie() {
  cookies().set({
    name: AUTH_COOKIE,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
