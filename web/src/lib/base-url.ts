export function getBaseUrl() {
  // ブラウザ側は相対パスで OK
  if (typeof window !== 'undefined') return '';

  // 環境変数で明示している場合はそれを使う
  if (process.env.BASE_URL) return process.env.BASE_URL;

  // 本番（Vercel）は VERCEL_URL が入る（例: labyoyaku.vercel.app）
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;

  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;

  // ローカル開発
  return 'http://localhost:3000';
}
