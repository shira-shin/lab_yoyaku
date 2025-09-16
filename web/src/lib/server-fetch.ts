import { headers } from 'next/headers'
import { apiUrl } from './fetcher'

// SSR で認証 Cookie を必ず同封して叩く fetch
export async function serverFetch(path: string, init: RequestInit = {}) {
  const cookie = headers().get('cookie') ?? ''
  const url = apiUrl(path)
  return fetch(url, {
    cache: 'no-store',
    ...init,
    headers: { ...(init.headers || {}), cookie },
  })
}
