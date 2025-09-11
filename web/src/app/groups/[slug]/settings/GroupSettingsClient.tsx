'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function GroupSettingsClient({ initialGroup }: { initialGroup: any }) {
  const [reserveFrom, setReserveFrom] = useState(initialGroup.reserveFrom || '');
  const [reserveTo, setReserveTo] = useState(initialGroup.reserveTo || '');
  const [memo, setMemo] = useState(initialGroup.memo || '');
  const [host, setHost] = useState(initialGroup.host || '');
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const members: string[] = initialGroup.members || [];

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await fetch(`/api/mock/groups/${initialGroup.slug}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          reserveFrom: reserveFrom || undefined,
          reserveTo: reserveTo || undefined,
          memo: memo || undefined,
          host: host || undefined,
        }),
      });
      if (!r.ok) throw new Error('failed');
      router.push(`/groups/${initialGroup.slug}`);
      router.refresh();
    } catch (e) {
      alert('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{initialGroup.name} の設定</h1>
      <form onSubmit={onSubmit} className="space-y-4 max-w-md">
        <label className="block">
          <div className="mb-1">ホスト</div>
          <select
            value={host}
            onChange={(e) => setHost(e.target.value)}
            className="input"
          >
            <option value="">未設定</option>
            {members.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <div className="mb-1">予約開始（任意）</div>
          <input
            type="datetime-local"
            value={reserveFrom}
            onChange={(e) => setReserveFrom(e.target.value)}
            className="input"
          />
        </label>
        <label className="block">
          <div className="mb-1">予約終了（任意）</div>
          <input
            type="datetime-local"
            value={reserveTo}
            onChange={(e) => setReserveTo(e.target.value)}
            className="input"
          />
        </label>
        <label className="block">
          <div className="mb-1">メモ（任意）</div>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            className="input"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 px-4 py-2"
        >
          保存
        </button>
      </form>
    </div>
  );
}
