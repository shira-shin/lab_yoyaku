import { headers } from 'next/headers';

export function getBaseUrl() {
  const env = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (env) return env.replace(/\/$/, '');
  const h = headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const proto = h.get('x-forwarded-proto') ?? 'https';
  return `${proto}://${host}`;
}
