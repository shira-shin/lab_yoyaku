import { cookies } from 'next/headers'

const COOKIE_NAME = 'lab_session'
export const AUTH_COOKIE = COOKIE_NAME

export function setSessionCookie(token: string, maxAgeSec = 60 * 60 * 24 * 30) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeSec,
  })
}

export function clearSessionCookie() {
  cookies().set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}
