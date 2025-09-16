export function apiUrl(path: string) {
  if (path.startsWith('http')) return path
  const base =
    process.env.NEXT_PUBLIC_BASE_URL ??
    (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ??
    'http://localhost:3000'
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}
