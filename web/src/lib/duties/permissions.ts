import type { Group, GroupMember } from '@prisma/client';

export type GroupWithMembers = Group & { members: Pick<GroupMember, 'email'>[] };

export function isGroupMember(group: GroupWithMembers, email: string | null | undefined) {
  if (!email) return false;
  return group.hostEmail === email || group.members.some((member) => member.email === email);
}

export function isGroupAdmin(group: GroupWithMembers, email: string | null | undefined) {
  if (!email) return false;
  return group.hostEmail === email;
}

export function canManageDuties(group: GroupWithMembers, email: string | null | undefined) {
  if (isGroupAdmin(group, email)) return true;
  if (group.dutyManagePolicy === 'MEMBERS_ALLOWED') {
    return isGroupMember(group, email);
  }
  return false;
}
