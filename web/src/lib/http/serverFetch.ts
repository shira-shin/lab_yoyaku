import { absUrl } from '@/lib/url';
import { headers } from 'next/headers';

type NextInit = { next?: { revalidate?: number | false } };

// 受け取りは広めに取る（false を許容）
export type Init = Omit<RequestInit, 'next'> & NextInit;

export async function serverFetch(path: string, init: Init = {}) {
  const url = absUrl(path);

  // Cookie をサーバからAPIへフォワード（必要なら）
  const h = headers();
  const cookie = h.get('cookie') ?? undefined;

  const headerBag = new Headers(init.headers as HeadersInit);
  if (cookie && !headerBag.has('cookie')) headerBag.set('cookie', cookie);

  // revalidate 正規化
  const { headers: _headers, next, ...rest } = init;
  let normalized: RequestInit & { next?: { revalidate?: number } } = {
    ...rest,
    headers: headerBag,
  };

  if (next?.revalidate === false) {
    // false は no-store に変換し、next は付けない
    normalized.cache = 'no-store';
  } else if (typeof next?.revalidate === 'number') {
    normalized.next = { revalidate: next.revalidate };
  }

  // no-store と next の併用は避ける（優先は no-store）
  if (normalized.cache === 'no-store' && normalized.next) {
    delete normalized.next;
  }

  // 認証クッキーを使う前提なら include で統一
  if (!normalized.credentials) normalized.credentials = 'include';

  return fetch(url, normalized);
}
