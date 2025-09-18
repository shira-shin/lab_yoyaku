import { headers } from 'next/headers';
import { getBaseUrl } from './http/base-url';

type ServerFetchInit = RequestInit & { next?: Record<string, unknown> };

/** SSR/RSC から内部APIを叩くための安全な fetch */
export async function serverFetch(input: string, init: ServerFetchInit = {}) {
  const base = getBaseUrl();
  const url = input.startsWith('http')
    ? input
    : `${base}${input.startsWith('/') ? '' : '/'}${input}`;

  const h = new Headers(init.headers);
  const cookie = headers().get('cookie') ?? '';
  h.set('cookie', cookie);

  const next = { ...(init.next ?? {}), revalidate: 0 };

  return fetch(url, {
    ...init,
    headers: h,
    cache: 'no-store',
    next,
    credentials: 'include',
  });
}
