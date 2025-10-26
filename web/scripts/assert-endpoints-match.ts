import { URL } from 'node:url';

const must = (name: string) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`[assert-endpoints-match] Missing env: ${name}`);
  }
  return value;
};

const hostToEp = (raw: string) => {
  const hostname = new URL(raw).hostname;
  const match = hostname.match(/^(ep-[a-z0-9-]+)(?:-pooler)?\./);
  if (!match) {
    throw new Error(`[assert-endpoints-match] Could not parse ep from host: ${hostname}`);
  }
  return match[1];
};

const databaseUrl = must('DATABASE_URL');
const directUrl = must('DIRECT_URL');

const epDb = hostToEp(databaseUrl);
const epDirect = hostToEp(directUrl);

if (epDb !== epDirect) {
  throw new Error(
    `[assert-endpoints-match] ep mismatch: DATABASE_URL(${epDb}) !== DIRECT_URL(${epDirect})`,
  );
}

console.log(`[assert-endpoints-match] OK: endpoint ${epDb}`);
