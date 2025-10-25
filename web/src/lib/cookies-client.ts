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
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
}
export async function setCookie(name: string, value: string, options?: CookieOptions) {
  return postJSON('/api/cookies/set', { name, value, options });
}
export async function deleteCookie(name: string, options?: CookieOptions) {
  return postJSON('/api/cookies/delete', { name, options });
}
