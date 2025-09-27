'use client';

import { useMemo, useState, useTransition } from 'react';

type MemberOption = { id: string; label: string; email?: string };
type DutyRule = {
  id: string;
  startDate: string;
  endDate: string;
  byWeekday: number[];
  slotsPerDay: number;
  startTime?: string | null;
  endTime?: string | null;
};
type DutyType = {
  id: string;
  name: string;
  kind: 'DAY_SLOT' | 'TIME_RANGE';
  rules: DutyRule[];
};

type DutyInlineCreateProps = {
  date: string;
  members: MemberOption[];
  types: DutyType[];
};

function matchesRule(rule: DutyRule, date: Date) {
  const start = new Date(rule.startDate);
  const end = new Date(rule.endDate);
  if (date < start || date > end) return false;
  if (rule.byWeekday && rule.byWeekday.length > 0) {
    const weekday = date.getUTCDay();
    if (!rule.byWeekday.includes(weekday)) return false;
  }
  return true;
}

export default function DutyInlineCreate({ date, members, types }: DutyInlineCreateProps) {
  const [typeId, setTypeId] = useState(types[0]?.id ?? '');
  const [assigneeId, setAssigneeId] = useState('');
  const [slotIndex, setSlotIndex] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedType = useMemo(() => types.find((type) => type.id === typeId), [types, typeId]);
  const targetDate = useMemo(() => new Date(`${date}T00:00:00Z`), [date]);

  function handleSubmit() {
    if (!typeId) {
      setMessage('当番の種類を選択してください');
      return;
    }
    startTransition(async () => {
      setMessage(null);
      try {
        const payload: Record<string, unknown> = {
          typeId,
          date,
          assigneeId: assigneeId || null,
        };
        if (selectedType?.kind === 'DAY_SLOT') {
          payload.slotIndex = Number.isFinite(slotIndex) ? Math.max(0, slotIndex) : 0;
        }
        if (selectedType?.kind === 'TIME_RANGE') {
          const rule = selectedType.rules.find((candidate) => matchesRule(candidate, targetDate));
          if (rule?.startTime && rule?.endTime) {
            payload.startsAt = rule.startTime;
            payload.endsAt = rule.endTime;
          }
        }
        const res = await fetch('/api/duties/assign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          setMessage(data?.error ?? '作成に失敗しました');
          return;
        }
        setMessage('作成しました');
      } catch (error) {
        console.error('assign duty failed', error);
        setMessage('作成に失敗しました');
      }
    });
  }

  return (
    <div className="flex flex-col gap-2 border-t pt-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <select
          className="border rounded px-2 py-1"
          value={typeId}
          onChange={(event) => setTypeId(event.target.value)}
          disabled={isPending}
        >
          {types.length === 0 && <option value="">種類がありません</option>}
          {types.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
        {selectedType?.kind === 'DAY_SLOT' && (
          <label className="flex items-center gap-1">
            <span>スロット</span>
            <input
              type="number"
              min={0}
              value={slotIndex}
              onChange={(event) => setSlotIndex(Number(event.target.value) || 0)}
              className="w-16 border rounded px-2 py-1"
              disabled={isPending}
            />
          </label>
        )}
        <select
          className="border rounded px-2 py-1"
          value={assigneeId}
          onChange={(event) => setAssigneeId(event.target.value)}
          disabled={isPending}
        >
          <option value="">未割当</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.label || member.email || member.id}
            </option>
          ))}
        </select>
        <button
          onClick={handleSubmit}
          disabled={isPending || types.length === 0}
          className="px-3 py-1 rounded bg-purple-600 text-white disabled:opacity-50"
        >
          {isPending ? '作成中...' : '追加'}
        </button>
      </div>
      {message && <p className="text-xs text-gray-500">{message}</p>}
    </div>
  );
}
