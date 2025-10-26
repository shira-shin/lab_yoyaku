import { URL } from 'node:url';

const need = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`[assert-endpoints-match] Missing env: ${k}`);
  return v;
};

const epFrom = (url: string) => {
  const host = new URL(url).hostname;
  const first = host.split('.')[0];
  return first.replace(/-pooler$/, '');
};

const db = need('DATABASE_URL');
const dir = need('DIRECT_URL');

const epDb = epFrom(db);
const epDirect = epFrom(dir);

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
