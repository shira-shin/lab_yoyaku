import { headers } from 'next/headers';
import { apiUrl } from './fetcher';

function normalizeHeaders(init?: HeadersInit): Record<string, string> {
  if (!init) {
    return {};
  }
  if (init instanceof Headers) {
    return Object.fromEntries(init.entries());
  }
  if (Array.isArray(init)) {
    return Object.fromEntries(init);
  }
  return { ...init };
}

export async function serverFetch(input: string, init: RequestInit = {}) {
  const cookie = headers().get('cookie') ?? '';
  const mergedHeaders = {
    ...normalizeHeaders(init.headers),
    cookie,
  };

  const target = apiUrl(input);

  return fetch(target, {
    ...init,
    headers: mergedHeaders,
    cache: 'no-store',
  });
}
