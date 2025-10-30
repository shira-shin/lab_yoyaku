import { getBaseUrl } from "@/lib/get-base-url";

export type CookieOptions = Partial<{
  httpOnly: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  secure: boolean;
  path: string;
  maxAge: number;
  expires: string | number | Date;
  domain: string;
}>;
async function postJSON(url: string, body: unknown) {
  const isAbsolute = /^https?:/i.test(url);
  const target =
    typeof window === "undefined" && !isAbsolute ? `${getBaseUrl()}${url}` : url;
  const res = await fetch(target, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${target} ${res.status}`);
  return res.json();
}
export async function setCookie(name: string, value: string, options?: CookieOptions) {
  return postJSON('/api/cookies/set', { name, value, options });
}
export async function deleteCookie(name: string, options?: CookieOptions) {
  return postJSON('/api/cookies/delete', { name, options });
}
