export class UnauthorizedError extends Error {}

export type JSONHeaders = Record<string, string>;

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.document !== 'undefined';
}

function baseUrl() {
  if (isBrowser()) return '';
  const env = process.env;
  const fromNextAuth = env.NEXTAUTH_URL || env.AUTH_URL;
  if (fromNextAuth) return fromNextAuth.replace(/\/+$/, '');
  if (env.VERCEL_URL) return `https://${env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

/** HeadersInit -> Record<string,string> に正規化（型安全・ランタイム差吸収） */
function normalizeHeaders(h?: HeadersInit): JSONHeaders | undefined {
  if (!h) return undefined;
  const out: JSONHeaders = {};
  if (h instanceof Headers) {
    h.forEach((v, k) => { out[k] = v; });
    return out;
  }
  if (Array.isArray(h)) {
    for (const [k, v] of h) out[k] = v;
    return out;
  }
  return h as Record<string, string>;
}

export async function getJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${baseUrl()}${path}`;
  const extra = normalizeHeaders(init?.headers);

  const res = await fetch(url, {
    ...init,
    headers: {
      accept: 'application/json',
      ...(extra || {}),
    },
  });

  if (res.status === 401) throw new UnauthorizedError('unauthorized');
  if (!res.ok) throw new Error(`GET ${url} ${res.status}`);
  return (await res.json()) as T;
}
