import { normalizeEmail } from '@/lib/auth-legacy';
import { findUserByEmailNormalized } from '@/lib/users';
import { prisma } from '@/server/db/prisma';

export async function getActorByEmail(email?: string | null) {
  if (!email) return null;
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const user = await findUserByEmailNormalized(normalized);
  if (!user) return null;
  return { id: user.id, email: user.email, name: user.name ?? null };
}

export async function getGroupAndRole(slug: string, userId: string) {
  const group = await prisma.group.findUnique({
    where: { slug: slug.toLowerCase() },
    select: { id: true, slug: true, dutyManagePolicy: true },
  });
  if (!group) return null;
  const member = await prisma.groupMember.findFirst({
    where: { groupId: group.id, userId },
    select: { role: true },
  });
  return { group, role: member?.role ?? null };
}

export const isAdmin = (role?: string | null) => role === 'OWNER' || role === 'ADMIN';

export function canManageDuties(policy: 'ADMINS_ONLY' | 'MEMBERS_ALLOWED', role?: string | null) {
  if (policy === 'MEMBERS_ALLOWED') return !!role;
  return isAdmin(role);
}
