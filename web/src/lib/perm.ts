import { prisma } from '@/lib/prisma';

export async function getActorByEmail(email?: string | null) {
  if (!email) return null;
  return prisma.user.findUnique({ where: { email }, select: { id: true, email: true, name: true } });
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
