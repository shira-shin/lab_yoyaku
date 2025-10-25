import { prisma } from '@/lib/prisma';
import { normalizeEmail } from '@/lib/email';

export { normalizeEmail };

export async function findUserByEmailNormalized(email: string) {
  const normalized = normalizeEmail(email);
  const user = await prisma.user.findUnique({ where: { email: normalized } });
  if (user) {
    return user;
  }
  return prisma.user.findFirst({
    where: {
      OR: [
        { normalizedEmail: normalized },
        { email: { equals: email, mode: 'insensitive' } },
      ],
    },
  });
}
