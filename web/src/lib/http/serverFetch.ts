import { headers } from 'next/headers';
import { absUrl } from '@/lib/url';

export async function serverFetch(path: string, init: RequestInit = {}) {
  const incomingHeaders = headers();
  const target = absUrl(path);
  const cookie = incomingHeaders.get('cookie') ?? '';

  const headerBag = new Headers(init.headers ?? undefined);
  if (cookie) {
    headerBag.set('cookie', cookie);
  }
  headerBag.set('accept', 'application/json');

  const { next, ...rest } = init as RequestInit & { next?: any };

  return fetch(target, {
    ...rest,
    cache: 'no-store',
    credentials: 'include',
    headers: headerBag,
    ...(next ? { next } : {}),
  });
}
