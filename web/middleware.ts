import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

const PROTECTED = [/^\/dashboard/, /^\/groups(\/.*)?$/, /^\/devices(\/.*)?$/]

export async function middleware(req: NextRequest) {
  const url = req.nextUrl
  const isProtected = PROTECTED.some((re) => re.test(url.pathname))

  if (!isProtected) return NextResponse.next()

  const token = req.cookies.get('auth_token')?.value
  if (!token || !(await verifyToken(token))) {
    const login = new URL('/login', req.url)
    login.searchParams.set('next', url.pathname)
    return NextResponse.redirect(login)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next|favicon.ico|api).*)'],
}
