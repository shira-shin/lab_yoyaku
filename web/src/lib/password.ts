import bcrypt from "bcryptjs";
import { createHash } from "crypto";

const BCRYPT_REGEX = /^\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{53}$/;
const LEGACY_SHA_REGEX = /^[a-f0-9]{40}$/i;

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string) {
  if (BCRYPT_REGEX.test(hash)) return bcrypt.compare(plain, hash);
  if (LEGACY_SHA_REGEX.test(hash)) {
    const legacy = createHash("sha1").update(plain).digest("hex");
    return legacy === hash.toLowerCase();
  }
  throw new Error("Unsupported hash format");
}

export function needsRehash(hash: string, desiredCost = 10) {
  if (BCRYPT_REGEX.test(hash)) {
    const cost = parseInt(hash.split("$")[2], 10);
    return Number.isFinite(cost) && cost < desiredCost;
  }
  return true;
}
