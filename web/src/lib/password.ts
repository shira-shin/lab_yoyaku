import bcrypt from 'bcryptjs';
import { hashPassword } from '@/lib/auth';

const BCRYPT_TARGET_COST = (() => {
  const env = parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10);
  return Number.isNaN(env) ? 12 : env;
})();

const LEGACY_SHA_REGEX = /^[0-9a-f]{64}$/i;

export async function verifyPassword(plain: string, hash: string | null | undefined) {
  if (!hash) return false;
  if (hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$')) {
    return bcrypt.compare(plain, hash);
  }
  if (LEGACY_SHA_REGEX.test(hash)) {
    return hashPassword(plain) === hash.toLowerCase();
  }
  throw new Error('Unsupported hash format');
}

export async function needsRehash(hash: string | null | undefined) {
  if (!hash) return true;
  if (hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$')) {
    const cost = parseInt(hash.slice(4, 6), 10);
    if (Number.isNaN(cost)) return true;
    return cost < BCRYPT_TARGET_COST;
  }
  if (LEGACY_SHA_REGEX.test(hash)) {
    return true;
  }
  return true;
}
