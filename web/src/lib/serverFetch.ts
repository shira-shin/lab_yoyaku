import { headers } from 'next/headers';
import { getBaseUrl } from './http/base-url';

/** SSR/RSC から内部APIを叩くための安全な fetch */
export async function serverFetch(input: string, init: RequestInit = {}) {
  const base = getBaseUrl();
  const url = input.startsWith('http')
    ? input
    : `${base}${input.startsWith('/') ? '' : '/'}${input}`;

  const h = new Headers(init.headers);
  const cookie = headers().get('cookie');
  if (cookie) h.set('cookie', cookie);

  return fetch(url, {
    ...init,
    headers: h,
    cache: 'no-store',
    credentials: 'include',
  });
}
