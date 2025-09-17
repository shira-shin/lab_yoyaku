import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname
  const mockEnabled = process.env.USE_MOCK === 'true'
  if ((process.env.NODE_ENV === 'production' || !mockEnabled) && pathname.startsWith('/api/mock')) {
    return new NextResponse('Mock APIs are disabled', { status: 410 })
  }

  const { search } = req.nextUrl
  const m = pathname.match(/^\/(groups|devices)\/([^\/]+)/)
  if (m) {
    const lower = m[2].toLowerCase()
    if (m[2] !== lower) {
      const url = req.nextUrl.clone()
      url.pathname = `/${m[1]}/${lower}${pathname.slice(m[0].length)}`
      return NextResponse.redirect(url, 301)
    }
  }

  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/public')
  ) {
    return NextResponse.next()
  }

  const token = req.cookies.get('labyoyaku_token')?.value
  if (!token) {
    const url = new URL('/login', req.url)
    const next = pathname + (search || '')
    url.searchParams.set('next', next || '/')
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/mock/:path*', '/((?!_next|favicon|public).*)'],
}
