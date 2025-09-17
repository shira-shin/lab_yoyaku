import { headers } from 'next/headers';

function resolveBaseURL() {
  const envUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);
  return envUrl ?? 'http://localhost:3000';
}

/** SSR/RSC から内部APIを叩くための安全な fetch */
export async function serverFetch(input: string, init: RequestInit = {}) {
  const base = resolveBaseURL();
  const url = input.startsWith('http') ? input : new URL(input, base).toString();

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
