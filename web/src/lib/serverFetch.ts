import { headers } from 'next/headers';

export async function serverFetch(input: string, init: RequestInit = {}) {
  const cookie = headers().get('cookie') ?? '';
  const mergedHeaders = {
    ...(init.headers as Record<string, string> | undefined),
    cookie,
  };

  return fetch(input, {
    ...init,
    headers: mergedHeaders,
    cache: 'no-store',
  });
}
