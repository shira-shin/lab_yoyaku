import { headers } from 'next/headers'

export async function serverFetch(path: string, init: RequestInit = {}) {
  const incomingHeaders = headers()
  const proto = incomingHeaders.get('x-forwarded-proto') ?? 'https'
  const host =
    incomingHeaders.get('x-forwarded-host') ??
    process.env.NEXT_PUBLIC_BASE_HOST ??
    'labyoyaku.vercel.app'
  const base = `${proto}://${host}`
  const url = new URL(path, base).toString()
  const cookie = incomingHeaders.get('cookie') ?? ''

  const headerBag = new Headers(init.headers)
  headerBag.set('cookie', cookie)

  return fetch(url, {
    ...init,
    cache: 'no-store',
    headers: headerBag,
  })
}
