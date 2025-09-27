"use server";

import { headers } from "next/headers";

/** 環境に応じて API の絶対URLを返す */
export function getBaseUrl() {
  // 1. 手動設定（任意）
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;
  // 2. Vercel 本番/プレビュー
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  // 3. ローカル/その他（ヘッダから組み立て）
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

/** 相対/絶対どちらでも渡せる。相対なら base を前置。 */
export function absUrl(path: string) {
  if (/^https?:\/\//.test(path)) return path;
  return `${getBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}
