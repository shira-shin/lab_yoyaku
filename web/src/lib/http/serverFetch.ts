import { headers } from 'next/headers';
import { absUrl } from '@/lib/url';

export type Init = Omit<RequestInit, 'next'> & {
  // Next.js の fetch 拡張。false も受け取り、内部で no-store に正規化する
  next?: { revalidate?: number | false };
};

export async function serverFetch(path: string, init: Init = {}) {
  const cookie = headers().get('cookie') ?? '';
  const url = absUrl(path);

  const headerBag = new Headers(init.headers ?? undefined);
  if (cookie) {
    headerBag.set('cookie', cookie);
  }

  const { headers: _headers, ...rest } = init;
  const opts: RequestInit & { next?: { revalidate?: number } } = {
    ...rest,
    headers: headerBag,
  };

  // revalidate: false を cache: 'no-store' に変換
  if (init.next?.revalidate === false) {
    if (opts.next) delete (opts.next as any).revalidate;
    if (opts.next && Object.keys(opts.next).length === 0) delete (opts as any).next;
    (opts as any).cache = 'no-store';
  }

  // "cache: 'no-store'" と "next.revalidate" の二重指定は片方に統一
  if (opts.cache === 'no-store' && opts.next?.revalidate !== undefined) {
    delete (opts as any).next;
  }

  opts.credentials ??= 'include';

  return fetch(url, opts);
}
