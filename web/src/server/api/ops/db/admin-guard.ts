import 'server-only';

import { NextResponse } from 'next/server';

import { normalizeEmail, readUserFromCookie } from '@/lib/auth-legacy';

export type AdminGuardResult =
  | { ok: true; email: string }
  | { ok: false; response: NextResponse };

function parseAllowlist() {
  const raw = process.env.OPS_DB_ADMIN_EMAIL_ALLOWLIST || process.env.OPS_DB_INIT_EMAIL_ALLOWLIST || '';
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => normalizeEmail(item));
}

export async function guardOpsAdminAccess(context: { feature: string }): Promise<AdminGuardResult> {
  const allowlist = parseAllowlist();
  if (!allowlist.length) {
    console.warn(`[${context.feature}] allowlist is empty; access denied`);
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 }),
    };
  }

  const me = await readUserFromCookie().catch(() => null);
  if (!me?.email) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 }),
    };
  }

  const email = normalizeEmail(me.email);
  if (!allowlist.includes(email)) {
    console.warn(`[${context.feature}] forbidden`, { email });
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 }),
    };
  }

  return { ok: true, email };
}
