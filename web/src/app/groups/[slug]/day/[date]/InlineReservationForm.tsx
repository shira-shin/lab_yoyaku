'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type DeviceOption = { id: string; slug: string; name: string };

type Props = {
  slug: string;
  date: string;
  devices: DeviceOption[];
};

export default function InlineReservationForm({ slug, date, devices }: Props) {
  const router = useRouter();
  const [deviceSlug, setDeviceSlug] = useState(devices[0]?.slug ?? '');
  const [start, setStart] = useState(`${date}T13:00`);
  const [end, setEnd] = useState(`${date}T14:00`);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!deviceSlug) {
      alert('機器を選択してください');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupSlug: slug,
          deviceSlug,
          start: start.replace('T', ' ').replace(/-/g, '/'),
          end: end.replace('T', ' ').replace(/-/g, '/'),
          note,
        }),
        credentials: 'same-origin',
      });
      const json = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        throw new Error(json?.message ?? json?.error ?? res.statusText);
      }
      router.refresh();
    } catch (error) {
      alert(`作成失敗: ${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  const hasDevices = devices.length > 0;

  return (
    <section className="rounded-2xl border p-4 space-y-3 bg-white">
      <h2 className="font-semibold">この日に予約を追加</h2>
      {hasDevices ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="space-y-1">
            <span className="text-sm text-gray-600">機器</span>
            <select
              value={deviceSlug}
              onChange={(e) => setDeviceSlug(e.target.value)}
              className="w-full border rounded-lg p-2"
            >
              {devices.map((d) => (
                <option key={d.id} value={d.slug}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-sm text-gray-600">開始</span>
            <input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-full border rounded-lg p-2"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm text-gray-600">終了</span>
            <input
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-full border rounded-lg p-2"
            />
          </label>
        </div>
      ) : (
        <p className="text-sm text-gray-500">このグループには登録された機器がありません。</p>
      )}
      <label className="block space-y-1">
        <span className="text-sm text-gray-600">メモ（任意）</span>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full border rounded-lg p-2"
        />
      </label>
      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
        <button
          type="button"
          onClick={submit}
          disabled={saving || !hasDevices}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50"
        >
          {saving ? '作成中...' : '予約を追加'}
        </button>
        <span>※重複時はサーバ側で409を返します</span>
      </div>
    </section>
  );
}
