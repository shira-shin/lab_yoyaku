import bcrypt from "bcryptjs";
import { createHash } from "crypto";

const BCRYPT_REGEX = /^\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{53}$/;
const LEGACY_SHA_REGEX = /^[a-f0-9]{40}$/i;

export const DEFAULT_BCRYPT_COST = 10;

export type PasswordHashType = "bcrypt" | "legacy-sha1" | "unknown";

export function detectPasswordHashType(hash: string): PasswordHashType {
  if (BCRYPT_REGEX.test(hash)) return "bcrypt";
  if (LEGACY_SHA_REGEX.test(hash)) return "legacy-sha1";
  return "unknown";
}

// 標準ハッシュ（新規作成時は bcrypt）
export async function hashPassword(
  plain: string,
  cost = DEFAULT_BCRYPT_COST
) {
  return bcrypt.hash(plain, cost);
}

// 既存ハッシュとの照合（bcrypt とレガシー SHA1 の両対応）
export async function verifyPassword(plain: string, hash: string) {
  if (BCRYPT_REGEX.test(hash)) {
    return bcrypt.compare(plain, hash);
  }

  if (LEGACY_SHA_REGEX.test(hash)) {
    const legacy = createHash("sha1").update(plain).digest("hex");
    return legacy === hash.toLowerCase();
  }

  throw new Error("Unsupported hash format");
}

// 再ハッシュが必要か（コストが低い bcrypt またはレガシーは true）
export function needsRehash(hash: string, desiredCost = DEFAULT_BCRYPT_COST) {
  if (BCRYPT_REGEX.test(hash)) {
    const cost = parseInt(hash.split("$")[2], 10);
    return Number.isFinite(cost) && cost < desiredCost;
  }

  // レガシーは常に再ハッシュ推奨
  return true;
}
