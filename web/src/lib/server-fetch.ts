import { headers } from 'next/headers';

// 相対パスを現在ホストの絶対URLに変換
export function absoluteUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  const h = headers();
  const proto = h.get('x-forwarded-proto') ?? 'https';
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${proto}://${host}${p}`;
}

// SSR で認証 Cookie を必ず同封して叩く fetch
export async function serverFetch(path: string, init: RequestInit = {}) {
  const cookie = headers().get('cookie') ?? '';
  const url = absoluteUrl(path);
  return fetch(url, {
    cache: 'no-store', // 再検証オプションなしで警告を回避
    ...init,
    headers: { ...(init.headers || {}), cookie }, // Cookieで認証を引き継ぐ
  });
}
