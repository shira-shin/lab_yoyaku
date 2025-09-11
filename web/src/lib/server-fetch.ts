import { headers } from 'next/headers';

export async function serverFetch(path: string, init: RequestInit = {}) {
  const isAbsolute = /^https?:\/\//.test(path);
  const url = isAbsolute ? path : path; // 相対のままでOK（同一オリジン想定）
  const cookie = headers().get('cookie') ?? '';
  return fetch(url, {
    cache: 'no-store',
    ...init,
    headers: {
      ...(init.headers || {}),
      cookie, // ← これが超重要（認証を引き継ぐ）
    },
  });
}
