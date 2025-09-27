export type Member = { id: string };
export type Slot = { date: Date; slotIndex: number; locked: boolean; assigneeId?: string };
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
  const avoidConsecutive = opts.avoidConsecutive ?? true;
  const groupsByCount = new Map<number, Member[]>();
  for (const member of members) {
    const count = existingCount.get(member.id) ?? 0;
    if (!groupsByCount.has(count)) groupsByCount.set(count, []);
    groupsByCount.get(count)!.push(member);
  }

  const counts = Array.from(groupsByCount.keys()).sort((a, b) => a - b);
  const queue: Member[] = [];
  for (const count of counts) {
    const arr = groupsByCount.get(count)!;
    shuffleInPlace(arr, opts.seed);
    queue.push(...arr);
  }

  let q = [...queue];
  const byDateLastAssignee = new Map<string, string>();
  const result = slots.map((slot) => ({ ...slot }));

  for (const slot of result) {
    if (slot.locked && slot.assigneeId) continue;
    if (q.length === 0) {
      const currentCounts = new Map<string, number>();
      for (const member of members) {
        currentCounts.set(member.id, existingCount.get(member.id) ?? 0);
      }
      const min = Math.min(...Array.from(currentCounts.values()));
      const next = members.filter((member) => (currentCounts.get(member.id) ?? 0) === min);
      shuffleInPlace(next, opts.seed);
      q = [...next];
    }

    let index = 0;
    while (index < q.length) {
      const candidate = q[index];
      const key = slot.date.toISOString().slice(0, 10);
      const last = byDateLastAssignee.get(key);
      if (!avoidConsecutive || !last || last !== candidate.id) {
        break;
      }
      index++;
    }

    const chosen = q.splice(index < q.length ? index : 0, 1)[0];
    slot.assigneeId = chosen?.id;
    const dayKey = slot.date.toISOString().slice(0, 10);
    if (chosen?.id) {
      byDateLastAssignee.set(dayKey, chosen.id);
      existingCount.set(chosen.id, (existingCount.get(chosen.id) ?? 0) + 1);
    }
  }

  return result;
}

function shuffleInPlace<T>(arr: T[], seed = Date.now()) {
  let random = mulberry32(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
