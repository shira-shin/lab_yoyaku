import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const AUTH_COOKIE_NAME = process.env.NEXT_PUBLIC_AUTH_COOKIE_NAME ?? 'lab_session'
const STATIC_EXT = /\.(?:css|js|json|ico|png|jpg|jpeg|gif|svg|webp|txt|xml|map|woff2?|ttf)$/i

function isStaticAsset(pathname: string) {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/public') ||
    STATIC_EXT.test(pathname)
  )
}

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname
  const hasSession = Boolean(req.cookies.get(AUTH_COOKIE_NAME)?.value)
  const logPayload = {
    path: pathname,
    hasSession,
    nextUrl: req.nextUrl.href,
  }
  console.info('[middleware] access', logPayload)
  const mockEnabled = process.env.USE_MOCK === 'true'
  if ((process.env.NODE_ENV === 'production' || !mockEnabled) && pathname.startsWith('/api/mock')) {
    return new NextResponse('Mock APIs are disabled', { status: 410 })
  }

  const m = pathname.match(/^\/(groups|devices)\/([^\/]+)/)
  if (m) {
    const lower = m[2].toLowerCase()
    if (m[2] !== lower) {
      const url = req.nextUrl.clone()
      url.pathname = `/${m[1]}/${lower}${pathname.slice(m[0].length)}`
      return NextResponse.redirect(url, 301)
    }
  }

  const isExcluded =
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/health') ||
    pathname.startsWith('/groups/join')

  if (isExcluded || isStaticAsset(pathname)) {
    return NextResponse.next()
  }

  if (!hasSession) {
    const url = new URL('/login', req.url)
    const next = pathname + (req.nextUrl.search || '')
    url.searchParams.set('next', next || '/')
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon).*)'],
}
