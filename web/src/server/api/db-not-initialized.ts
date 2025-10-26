import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { NextResponse } from 'next/server';
import { DB_NOT_INITIALIZED_ERROR } from '@/lib/db/constants';

export function isMissingTableError(error: unknown) {
  return error instanceof PrismaClientKnownRequestError && error.code === 'P2021';
}

export function respondDbNotInitialized() {
  return NextResponse.json({ error: DB_NOT_INITIALIZED_ERROR }, { status: 503 });
}

export function respondDbNotInitializedWithLog(scope: string, extra?: Record<string, unknown>) {
  const payload = { scope, ...extra };
  console.warn('[db:not-initialized]', payload);
  return respondDbNotInitialized();
}
