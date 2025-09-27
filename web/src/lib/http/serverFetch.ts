import { headers } from 'next/headers';
import { absUrl } from '@/lib/url';

type Init = RequestInit & { next?: { revalidate?: number } };

export async function serverFetch(path: string, init: Init = {}) {
  const cookie = headers().get('cookie') ?? '';
  const url = absUrl(path);

  const headerBag = new Headers(init.headers ?? undefined);
  if (cookie) {
    headerBag.set('cookie', cookie);
  }

  const { headers: _headers, ...rest } = init;

  return fetch(url, {
    ...rest,
    headers: headerBag,
    cache: 'no-store',
    credentials: 'include',
  });
}
