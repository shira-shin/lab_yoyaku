'use client';

import { useMemo, useState, useTransition } from 'react';

type MemberOption = { id: string; label: string; email?: string };

type DutyInlineEditorProps = {
  id: string;
  assigneeId?: string | null;
  locked?: boolean;
  done?: boolean;
  members: MemberOption[];
};

export default function DutyInlineEditor({
  id,
  assigneeId = null,
  locked = false,
  done = false,
  members,
}: DutyInlineEditorProps) {
  const [value, setValue] = useState(assigneeId ?? '');
  const [isLocked, setIsLocked] = useState(locked);
  const [isDone, setIsDone] = useState(done);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const options = useMemo(() => {
    return members;
  }, [members]);

  function handleSave() {
    startTransition(async () => {
      setMessage(null);
      try {
        const res = await fetch(`/api/duties/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assigneeId: value || null,
            locked: isLocked,
            done: isDone,
          }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          setMessage(data?.error ?? '更新に失敗しました');
          return;
        }
        setMessage('保存しました');
      } catch (error) {
        console.error('duty update failed', error);
        setMessage('更新に失敗しました');
      }
    });
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <select
        className="border rounded px-2 py-1"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        disabled={isPending}
      >
        <option value="">未割当</option>
        {options.map((member) => (
          <option key={member.id} value={member.id}>
            {member.label || member.email || member.id}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-1">
        <input
          type="checkbox"
          checked={isLocked}
          onChange={(event) => setIsLocked(event.target.checked)}
          disabled={isPending}
        />
        固定
      </label>
      <label className="flex items-center gap-1">
        <input
          type="checkbox"
          checked={isDone}
          onChange={(event) => setIsDone(event.target.checked)}
          disabled={isPending}
        />
        完了
      </label>
      <button
        onClick={handleSave}
        disabled={isPending}
        className="px-2 py-1 rounded bg-purple-600 text-white disabled:opacity-50"
      >
        {isPending ? '保存中...' : '保存'}
      </button>
      {message && <span className="text-xs text-gray-500">{message}</span>}
    </div>
  );
}
