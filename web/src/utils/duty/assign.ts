export type Member = { id: string };
export type Slot = {
  date: Date;
  slotIndex: number;
  locked: boolean;
  assigneeId?: string;
  startsAt?: Date | null;
  endsAt?: Date | null;
  allowedAssigneeIds?: string[];
  avoidConsecutive?: boolean;
};
export type Options = {
  avoidConsecutive?: boolean;
  seed?: number;
};

export function assignMembersToSlots(
  members: Member[],
  slots: Slot[],
  existingCount: Map<string, number>,
  opts: Options = {}
): Slot[] {
  const rng = mulberry32(opts.seed ?? Date.now());
  const byDateLastAssignee = new Map<string, string>();
  const result = slots.map((slot) => ({ ...slot }));

  for (const slot of result) {
    const dayKey = slot.date.toISOString().slice(0, 10);
    const slotAvoidConsecutive = slot.avoidConsecutive ?? opts.avoidConsecutive ?? true;

    if (slot.locked && slot.assigneeId) {
      if (slotAvoidConsecutive && slot.assigneeId) {
        byDateLastAssignee.set(dayKey, slot.assigneeId);
      }
      continue;
    }

    const allowedSet = new Set(slot.allowedAssigneeIds && slot.allowedAssigneeIds.length > 0 ? slot.allowedAssigneeIds : undefined);
    const eligibleMembers = allowedSet.size
      ? members.filter((member) => allowedSet.has(member.id))
      : members.slice();

    if (eligibleMembers.length === 0) {
      continue;
    }

    const sorted = eligibleMembers
      .map((member) => ({ member, count: existingCount.get(member.id) ?? 0 }))
      .sort((a, b) => a.count - b.count);

    if (sorted.length === 0) {
      continue;
    }

    const minCount = sorted[0].count;
    let candidates = sorted.filter((entry) => entry.count === minCount).map((entry) => entry.member);

    if (slotAvoidConsecutive) {
      const lastAssignee = byDateLastAssignee.get(dayKey);
      const filtered = candidates.filter((member) => member.id !== lastAssignee);
      if (filtered.length > 0) {
        candidates = filtered;
      }
    }

    const chosen = randomPick(candidates, rng);
    if (!chosen) {
      continue;
    }

    slot.assigneeId = chosen.id;
    byDateLastAssignee.set(dayKey, chosen.id);
    existingCount.set(chosen.id, (existingCount.get(chosen.id) ?? 0) + 1);
  }

  return result;
}

function randomPick<T>(arr: T[], rng: () => number) {
  if (arr.length === 0) return undefined;
  const index = Math.floor(rng() * arr.length);
  return arr[index];
}

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
