import { URL } from 'node:url';

const need = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`[assert-endpoints-match] Missing env: ${k}`);
  return v;
};

const epFrom = (url: string) => {
  const host = new URL(url).hostname; // ep-xxxxx[-pooler].ap-*.neon.tech
  const first = host.split('.')[0]; // ep-xxxxx[-pooler]
  return first.replace(/-pooler$/, ''); // ep-xxxxx
};

const mask = (url: string) => {
  try {
    const u = new URL(url);
    if (u.password) u.password = '****';
    return u.toString();
  } catch {
    return '<invalid-url>';
  }
};

const db = need('DATABASE_URL');
const dir = need('DIRECT_URL');

const epDb = epFrom(db);
const epDirect = epFrom(dir);

// 追加ログ（自己診断用）
console.log(
  '[assert-endpoints-match] VERCEL_ENV=%s, GIT_REF=%s, URLS={DATABASE_URL:%s, DIRECT_URL:%s}',
  process.env.VERCEL_ENV || '<na>',
  process.env.VERCEL_GIT_COMMIT_REF || '<na>',
  mask(db),
  mask(dir)
);

if (epDb !== epDirect) {
  const allow =
    process.env.PREBUILD_ALLOW_ENDPOINT_MISMATCH === '1' &&
    process.env.VERCEL_ENV !== 'production';
  const msg = `[assert-endpoints-match] ep mismatch: DATABASE_URL(${epDb}) !== DIRECT_URL(${epDirect})`;

  if (allow) {
    console.warn(msg + ' (warning only)');
  } else {
    throw new Error(msg);
  }
} else {
  console.log(`[assert-endpoints-match] OK: endpoint ${epDb}`);
}
