import { URL } from 'node:url';

const must = (name: string) => {
  const v = process.env[name];
  if (!v) throw new Error(`[assert-endpoints-match] Missing env: ${name}`);
  return v;
};

const hostToEp = (u: string) => {
  const h = new URL(u).hostname;
  const first = h.split('.')[0];
  return first.replace(/-pooler$/, '');
};

const db = must('DATABASE_URL');
const dir = must('DIRECT_URL');

const epDb = hostToEp(db);
const epDirect = hostToEp(dir);

if (epDb !== epDirect) {
  throw new Error(
    `[assert-endpoints-match] ep mismatch: DATABASE_URL(${epDb}) !== DIRECT_URL(${epDirect})`
  );
}

console.log(`[assert-endpoints-match] OK: endpoint ${epDb}`);
