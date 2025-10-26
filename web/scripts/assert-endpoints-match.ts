import { URL } from 'node:url';

const need = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`[assert-endpoints-match] Missing env: ${k}`);
  return v;
};

const epFrom = (raw: string) => {
  const u = new URL(raw);
  const host = u.hostname;                 // ep-xxxxx[-pooler].ap-*.neon.tech
  const first = host.split('.')[0];        // ep-xxxxx[-pooler]
  return first.replace(/-pooler$/, '');    // => ep-xxxxx
};

const mask = (raw: string) => {
  try {
    const u = new URL(raw);
    if (u.password) u.password = '****';
    return u.toString();
  } catch {
    return '<invalid-url>';
  }
};

const vercelEnv = process.env.VERCEL_ENV || '<na>';
const branch = process.env.VERCEL_GIT_COMMIT_REF || '<na>';
const dbUrl = need('DATABASE_URL');
const dirUrl = need('DIRECT_URL');

const epDb = epFrom(dbUrl);
const epDirect = epFrom(dirUrl);

// 期待 ep を固定したい場合に使う（任意）
const expected = process.env.PREBUILD_EXPECT_EP; // 例: ep-bitter-leaf-a1bq8tp9
const isProd = vercelEnv === 'production';

// 詳細ログ
console.log('[assert-endpoints-match] VERCEL_ENV=%s, BRANCH=%s', vercelEnv, branch);
console.log('[assert-endpoints-match] DATABASE_URL=%s', mask(dbUrl));
console.log('[assert-endpoints-match] DIRECT_URL  =%s', mask(dirUrl));
if (expected) console.log('[assert-endpoints-match] PREBUILD_EXPECT_EP=%s', expected);

const mismatch = epDb !== epDirect;
const wrongEp = expected ? (epDb !== expected || epDirect !== expected) : false;

if (isProd) {
  // 本番は厳格
  if (mismatch) throw new Error(`[assert-endpoints-match] ep mismatch: DATABASE_URL(${epDb}) !== DIRECT_URL(${epDirect})`);
  if (wrongEp) throw new Error(`[assert-endpoints-match] ep unexpected: expected(${expected}) but got db(${epDb})/direct(${epDirect})`);
  console.log(`[assert-endpoints-match] OK (prod): VERCEL_ENV=${vercelEnv}, epDb=${epDb}, epDirect=${epDirect}`);
} else {
  // Preview/Dev は警告のみで続行
  if (mismatch)
    console.warn(
      `[assert-endpoints-match] WARNING (non-prod): VERCEL_ENV=${vercelEnv}, ep mismatch db(${epDb}) vs direct(${epDirect})`
    );
  if (wrongEp)
    console.warn(
      `[assert-endpoints-match] WARNING (non-prod): VERCEL_ENV=${vercelEnv}, expected(${expected}) but got db(${epDb})/direct(${epDirect})`
    );
  console.log(`[assert-endpoints-match] CONTINUE (non-prod): VERCEL_ENV=${vercelEnv}, epDb=${epDb}, epDirect=${epDirect}`);
}
