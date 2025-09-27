'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/toast';

export default function GroupSettingsClient({ initialGroup }: { initialGroup: any }) {
  const [reserveFrom, setReserveFrom] = useState(initialGroup.reserveFrom || '');
  const [reserveTo, setReserveTo] = useState(initialGroup.reserveTo || '');
  const [memo, setMemo] = useState(initialGroup.memo || '');
  const [host, setHost] = useState(initialGroup.host || '');
  const [deviceManagePolicy, setDeviceManagePolicy] = useState<'HOST_ONLY' | 'MEMBERS_ALLOWED'>(
    initialGroup.deviceManagePolicy || 'HOST_ONLY'
  );
  const [dutyManagePolicy, setDutyManagePolicy] = useState<'ADMINS_ONLY' | 'MEMBERS_ALLOWED'>(
    initialGroup.dutyManagePolicy || 'ADMINS_ONLY'
  );
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const members: string[] = initialGroup.members || [];

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await fetch(`/api/groups/${encodeURIComponent(initialGroup.slug)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          reserveFrom: reserveFrom || undefined,
          reserveTo: reserveTo || undefined,
          memo: memo || undefined,
          host: host || undefined,
          deviceManagePolicy,
          dutyManagePolicy,
        }),
        credentials: 'same-origin',
      });
      if (!r.ok) throw new Error('failed');
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
        <h2 className="text-lg font-semibold mb-4">機器の管理権限</h2>
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="radio"
              name="deviceManagePolicy"
              checked={deviceManagePolicy === 'HOST_ONLY'}
              onChange={() => setDeviceManagePolicy('HOST_ONLY')}
            />
            <span>ホストのみ追加・削除可</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="radio"
              name="deviceManagePolicy"
              checked={deviceManagePolicy === 'MEMBERS_ALLOWED'}
              onChange={() => setDeviceManagePolicy('MEMBERS_ALLOWED')}
            />
            <span>メンバーも追加・削除可</span>
          </label>
        </div>
      </section>
      <section className="rounded-2xl border p-6 bg-white">
        <h2 className="text-lg font-semibold mb-4">当番の管理権限</h2>
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="radio"
              name="dutyManagePolicy"
              checked={dutyManagePolicy === 'ADMINS_ONLY'}
              onChange={() => setDutyManagePolicy('ADMINS_ONLY')}
            />
            <span>ホストのみ変更可</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="radio"
              name="dutyManagePolicy"
              checked={dutyManagePolicy === 'MEMBERS_ALLOWED'}
              onChange={() => setDutyManagePolicy('MEMBERS_ALLOWED')}
            />
            <span>メンバーも変更可</span>
          </label>
        </div>
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
