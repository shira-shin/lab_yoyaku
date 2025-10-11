import { NextResponse } from 'next/server'
import { clearSessionCookie } from '@/lib/auth/cookies'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

function getBaseUrl(request: Request) {
  const requestUrl = new URL(request.url)
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    `${requestUrl.protocol}//${requestUrl.host}`
  )
}

function resolveRedirectUrl(
  request: Request,
  requested: string | null | undefined,
  fallbackPath: string,
) {
  const base = new URL(getBaseUrl(request))
  if (requested) {
    try {
      const target = new URL(requested, base)
      if (target.origin === base.origin) {
        return target
      }
    } catch {
      /* ignore invalid url */
    }
  }
  return new URL(fallbackPath, base)
}

async function extractCallbackUrl(request: Request) {
  const requestUrl = new URL(request.url)
  const fromQuery =
    requestUrl.searchParams.get('callbackUrl') ??
    requestUrl.searchParams.get('next')
  if (fromQuery) return fromQuery

  if (request.method === 'POST') {
    const contentType = request.headers.get('content-type') ?? ''
    if (
      contentType.includes('application/x-www-form-urlencoded') ||
      contentType.includes('multipart/form-data')
    ) {
      try {
        const form = await request.formData()
        const value =
          form.get('callbackUrl') ?? form.get('next') ?? form.get('redirect')
        if (typeof value === 'string') return value
      } catch {
        /* ignore */
      }
    } else if (contentType.includes('application/json')) {
      try {
        const body = await request.json()
        const value =
          (body?.callbackUrl as string | undefined) ??
          (body?.next as string | undefined) ??
          (body?.redirect as string | undefined)
        if (value) return value
      } catch {
        /* ignore */
      }
    }
  }

  return null
}

async function doLogout(request: Request) {
  const callbackUrl = await extractCallbackUrl(request)
  const redirectTarget = resolveRedirectUrl(request, callbackUrl, '/signin')

  const res = NextResponse.redirect(redirectTarget)
  clearSessionCookie(res)
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  res.headers.set('Pragma', 'no-cache')
  res.headers.set('Expires', '0')
  return res
}

export async function GET(request: Request) {
  return doLogout(request)
}

export async function POST(request: Request) {
  return doLogout(request)
}
