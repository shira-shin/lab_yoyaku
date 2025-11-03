import { normalizeEmail } from "@/lib/email-normalize";
import { prisma } from "@/lib/prisma";

export { normalizeEmail };

export async function findUserByEmailNormalized(email: string) {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    return null;
  }
  return prisma.user.findUnique({ where: { normalizedEmail: normalized } });
}
