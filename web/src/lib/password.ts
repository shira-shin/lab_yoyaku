import bcrypt from "bcryptjs";
import { createHash } from "crypto";

const BCRYPT_REGEX = /^\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{53}$/;
const LEGACY_SHA_REGEX = /^[a-f0-9]{40}$/i;

// 標準ハッシュ（新規作成時は bcrypt）
export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

// 既存ハッシュとの照合（bcrypt とレガシー SHA1 の両対応）
export async function verifyPassword(plain: string, hash: string) {
  if (BCRYPT_REGEX.test(hash)) {
    return bcrypt.compare(plain, hash);
  }
  if (LEGACY_SHA_REGEX.test(hash)) {
    // レガシーは同期 SHA1 で比較（非同期は不要）
    const legacy = createHash("sha1").update(plain).digest("hex");
    return legacy === hash.toLowerCase();
  }
  throw new Error("Unsupported hash format");
}

// 再ハッシュが必要か（コストが低い bcrypt またはレガシーは true）
export function needsRehash(hash: string, desiredCost = 10) {
  if (BCRYPT_REGEX.test(hash)) {
    const cost = parseInt(hash.split("$")[2], 10);
    return Number.isFinite(cost) && cost < desiredCost;
  }
  // レガシーは常に再ハッシュ推奨
  return true;
}
