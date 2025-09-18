import { headers } from 'next/headers';

function resolveTargetUrl(path: string, proto: string, host: string) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  if (!path.startsWith('/')) {
    return `${proto}://${host}/${path}`;
  }
  return `${proto}://${host}${path}`;
}

export async function serverFetch(path: string, init: RequestInit = {}) {
  const incomingHeaders = headers();
  const proto = incomingHeaders.get('x-forwarded-proto') ?? 'https';
  const host =
    incomingHeaders.get('x-forwarded-host') ??
    incomingHeaders.get('host') ??
    process.env.NEXT_PUBLIC_BASE_HOST ??
    'labyoyaku.vercel.app';
  const target = resolveTargetUrl(path, proto, host);
  const cookie = incomingHeaders.get('cookie') ?? '';

  const headerBag = new Headers(init.headers ?? undefined);
  if (cookie) {
    headerBag.set('cookie', cookie);
  }
  headerBag.set('accept', 'application/json');

  const nextInit = (init as any)?.next ?? {};

  return fetch(target, {
    ...init,
    cache: 'no-store',
    credentials: 'include',
    headers: headerBag,
    next: { ...nextInit, revalidate: 0 },
  });
}
