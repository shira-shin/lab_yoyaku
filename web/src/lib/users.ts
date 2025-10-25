import { prisma } from '@/lib/prisma';
import { normalizeEmail } from '@/lib/email';

export { normalizeEmail };

export async function findUserByEmailNormalized(email: string) {
  const normalized = normalizeEmail(email);
  return prisma.user.findUnique({ where: { email: normalized } });
}
