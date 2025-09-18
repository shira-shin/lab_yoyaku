import { NextResponse, type NextRequest } from 'next/server'

export const config = {
  matcher: [
    '/dashboard',
    '/groups/:path*',
    '/devices/:path*',
    '/account/:path*',
    '/api/(me|groups|devices|reservations)(.*)',
  ],
}

export default function middleware(req: NextRequest) {
  const hasSession = !!req.cookies.get('lab_session')?.value
  if (!hasSession) {
    const url = new URL('/login', req.url)
    url.searchParams.set('next', req.nextUrl.pathname + req.nextUrl.search)
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}
