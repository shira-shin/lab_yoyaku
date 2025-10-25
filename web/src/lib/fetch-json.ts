export class UnauthorizedError extends Error {}

function resolveBaseUrl() {
  if (typeof window !== 'undefined') return '';
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  if (process.env.AUTH_URL) return process.env.AUTH_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

export async function getJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const base = resolveBaseUrl();
  const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`;
  const extraHeaders =
    init?.headers instanceof Headers
      ? Object.fromEntries(init.headers.entries())
      : (init?.headers as Record<string, string> | undefined);
  const headers: HeadersInit = {
    accept: 'application/json',
    ...extraHeaders,
  };

  const response = await fetch(url, {
    ...init,
    headers,
  });

  if (response.status === 401) {
    throw new UnauthorizedError('unauthorized');
  }

  if (!response.ok) {
    throw new Error(`GET ${url} ${response.status}`);
  }

  return (await response.json()) as T;
}
