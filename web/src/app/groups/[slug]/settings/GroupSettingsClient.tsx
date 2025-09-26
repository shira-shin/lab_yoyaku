'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/toast';

export default function GroupSettingsClient({ initialGroup }: { initialGroup: any }) {
  const [reserveFrom, setReserveFrom] = useState(initialGroup.reserveFrom || '');
  const [reserveTo, setReserveTo] = useState(initialGroup.reserveTo || '');
  const [memo, setMemo] = useState(initialGroup.memo || '');
  const [host, setHost] = useState(initialGroup.host || '');
  const [allowMemberDeviceCreate, setAllowMemberDeviceCreate] = useState(
    Boolean(initialGroup.allowMemberDeviceCreate)
  );
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const members: string[] = initialGroup.members || [];

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        reserveFrom: reserveFrom || undefined,
        reserveTo: reserveTo || undefined,
        memo: memo || undefined,
        host: host || undefined,
      };
      const base = `/api/groups/${encodeURIComponent(initialGroup.slug)}`;
      const [groupRes, settingsRes] = await Promise.all([
        fetch(base, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
          credentials: 'same-origin',
        }),
        fetch(`${base}/settings`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ allowMemberDeviceCreate }),
          credentials: 'same-origin',
        }),
      ]);
      if (!groupRes.ok || !settingsRes.ok) throw new Error('failed');
      toast.success('保存しました');
      router.refresh();
    } catch (e) {
      toast.error('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-3xl space-y-6">
      <section className="rounded-2xl border p-6 bg-white">
        <h2 className="text-lg font-semibold mb-4">予約窓</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <div className="mb-1">開始（任意）</div>
            <input
              type="datetime-local"
              value={reserveFrom}
              onChange={(e) => setReserveFrom(e.target.value)}
              className="input w-full"
            />
          </label>
          <label className="block">
            <div className="mb-1">終了（任意）</div>
            <input
              type="datetime-local"
              value={reserveTo}
              onChange={(e) => setReserveTo(e.target.value)}
              className="input w-full"
            />
          </label>
        </div>
        <label className="mt-4 flex items-center gap-2">
          <input
            type="checkbox"
            checked={allowMemberDeviceCreate}
            onChange={(event) => setAllowMemberDeviceCreate(event.target.checked)}
          />
          <span className="text-sm">一般メンバーによる機器追加を許可</span>
        </label>
      </section>
      <section className="rounded-2xl border p-6 bg-white">
      <h2 className="text-lg font-semibold mb-4">連絡先</h2>
        <label className="block mb-4">
          <div className="mb-1">ホスト</div>
          <select
            value={host}
            onChange={(e) => setHost(e.target.value)}
            className="input w-full"
          >
            <option value="">未設定</option>
            {members.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <div className="text-sm text-gray-500">将来の共同管理者用の説明ラベル</div>
      </section>
      <section className="rounded-2xl border p-6 bg-white">
        <h2 className="text-lg font-semibold mb-4">メモ</h2>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          className="input w-full"
          rows={4}
        />
        <div className="mt-4">
          <button type="submit" disabled={saving} className="btn btn-primary">
            保存
          </button>
        </div>
      </section>
    </form>
  );
}
