import crypto from "node:crypto";

import { prisma } from "@/server/db/prisma";

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export async function createPasswordResetToken(userId: string, ttlMinutes = 60) {
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: { userId, tokenHash, expiresAt },
  });

  return token;
}

export async function consumePasswordResetToken(token: string) {
  const tokenHash = sha256(token);
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!record || record.usedAt || record.expiresAt < new Date()) return null;

  await prisma.passwordResetToken.update({
    where: { tokenHash },
    data: { usedAt: new Date() },
  });

  return record.userId;
}
