import { headers } from "next/headers";

/** .env や Vercel 環境変数からの baseURL（あれば文字列を返す） */
function getBaseUrlFromEnv(): string | null {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL!;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return null;
}

/** Server 環境での Host 取得（RSC/Route/Action いずれでも可） */
function getServerBaseUrl(): string {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

/** どこからでも使える絶対URL化ヘルパ（Server/Browser 両対応） */
export function absUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;

  // 1) まず環境変数/Vercel
  const envBase = getBaseUrlFromEnv();
  if (envBase) return `${envBase}${path.startsWith("/") ? path : `/${path}`}`;

  // 2) ブラウザ実行時
  if (typeof window !== "undefined") {
    const { protocol, host } = window.location;
    return `${protocol}//${host}${path.startsWith("/") ? path : `/${path}`}`;
  }

  // 3) サーバー実行時（RSC/Route/Action）
  const srvBase = getServerBaseUrl();
  return `${srvBase}${path.startsWith("/") ? path : `/${path}`}`;
}
