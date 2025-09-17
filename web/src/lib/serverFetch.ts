import { headers } from 'next/headers';
import { getBaseUrl } from './base-url';

function resolveBaseURL() {
  const base = getBaseUrl();
  if (!base) {
    return 'http://localhost:3000';
  }
  return base;
}

/**
 * RSC/SSR から内部 API を叩くための安全な fetch
 * - 絶対URLに変換
 * - Cookie を前方転送
 * - キャッシュをしない（認証系なので）
 */
export async function serverFetch(input: string, init: RequestInit = {}) {
  const base = resolveBaseURL();
  const url = input.startsWith('http') ? input : new URL(input, base).toString();

  const headerInit = new Headers(init.headers);
  const cookie = headers().get('cookie');
  if (cookie) {
    headerInit.set('cookie', cookie);
  }

  return fetch(url, {
    ...init,
    headers: headerInit,
    cache: 'no-store',
    credentials: 'include',
  });
}
