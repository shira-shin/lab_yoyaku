import { headers } from "next/headers";

/** 現在のオリジン（サーバー or ブラウザ）を最優先で取得 */
function currentOrigin(): string | null {
  // ブラウザ実行時
  if (typeof window !== "undefined") return window.location.origin;

  // サーバー実行時（RSC/Route/Action）
  try {
    const h = headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (!host) return null;
    const proto = h.get("x-forwarded-proto") ?? "https";
    return `${proto}://${host}`;
  } catch {
    return null;
  }
}

/** 最後の手段としての環境変数（同一オリジン保証はしない） */
function envOrigin(): string | null {
  const env = process.env.VERCEL_URL || process.env.NEXT_PUBLIC_BASE_URL;
  if (!env) return null;
  return env.startsWith("http") ? env : `https://${env}`;
}

/** どこからでも使える絶対URL化ヘルパ（同一オリジン優先） */
export function absUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;

  const origin = currentOrigin() ?? envOrigin();
  if (origin) {
    return new URL(path.startsWith("/") ? path : `/${path}`, origin).toString();
  }

  // どうしても分からない場合は、そのまま返す（開発時の保険）
  return path.startsWith("/") ? path : `/${path}`;
}
