export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';

import { readUserFromCookie } from '@/lib/auth-legacy';
import {
  bootstrapDatabase,
  getDbInitializationSnapshot,
} from '@/lib/db/ensure-initialized';

type GuardResult =
  | { ok: true; email: string }
  | { ok: false; response: NextResponse };

function isPreview() {
  return process.env.VERCEL_ENV === 'preview';
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function parseAllowlist() {
  return (process.env.OPS_DB_INIT_EMAIL_ALLOWLIST || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map(normalizeEmail);
}

async function guardAccess(): Promise<GuardResult> {
  if (!isPreview()) {
    return { ok: false, response: NextResponse.json({ ok: false, error: 'not_available' }, { status: 404 }) };
  }

  const allowlist = parseAllowlist();
  if (!allowlist.length) {
    console.warn('[ops.db.init] allowlist is empty; access denied');
    return { ok: false, response: NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 }) };
  }

  const me = await readUserFromCookie().catch(() => null);
  if (!me?.email) {
    return { ok: false, response: NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 }) };
  }

  const email = normalizeEmail(me.email);
  if (!allowlist.includes(email)) {
    console.warn('[ops.db.init] forbidden', { email });
    return { ok: false, response: NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 }) };
  }

  return { ok: true, email };
}

export async function GET() {
  const guard = await guardAccess();
  if ('response' in guard) {
    return guard.response;
  }

  const snapshot = await getDbInitializationSnapshot();
  return NextResponse.json({ ok: true, viewer: { email: guard.email }, snapshot });
}

export async function POST() {
  const guard = await guardAccess();
  if ('response' in guard) {
    return guard.response;
  }

  console.warn('[ops.db.init] manual bootstrap requested', { email: guard.email });
  const result = await bootstrapDatabase('api.ops.db.init', { force: true });
  return NextResponse.json({
    ok: result.ok,
    attempted: result.attempted,
    lockAcquired: result.lockAcquired,
    skippedReason: result.skippedReason ?? null,
    tablesBefore: result.tablesBefore,
    tablesAfter: result.tablesAfter,
    error: result.error,
  });
}

