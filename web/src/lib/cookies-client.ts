export type CookieOptions = Partial<{
  httpOnly: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  secure: boolean;
  path: string;
  maxAge: number;
  expires: string | number | Date;
  domain: string;
}>;

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.document !== 'undefined';
}

function baseUrl() {
  if (isBrowser()) return '';

  const env = process.env;
  const fromNextAuth = env.NEXTAUTH_URL || env.AUTH_URL;
  if (fromNextAuth) {
    return fromNextAuth.replace(/\/+$/, '');
  }

  const vercelUrl = env.VERCEL_URL ? `https://${env.VERCEL_URL}` : undefined;
  if (vercelUrl) {
    return vercelUrl;
  }

  return 'http://localhost:3000';
}

async function postJSON(path: string, body: unknown) {
  const url = `${baseUrl()}${path}`;
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
