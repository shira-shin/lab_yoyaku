import { prisma } from '@/lib/prisma';

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export async function findUserByEmailNormalized(email: string) {
  const normalized = normalizeEmail(email);
  return prisma.user.findUnique({ where: { normalizedEmail: normalized } });
}
