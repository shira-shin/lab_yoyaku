'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/toast';

type DeviceOption = { id: string; slug: string; name: string };

type Props = {
  slug: string;
  date: string;
  devices: DeviceOption[];
};

export default function InlineReservationForm({ slug, date, devices }: Props) {
  const router = useRouter();
  const [deviceId, setDeviceId] = useState(devices[0]?.id ?? '');
  const [start, setStart] = useState(`${date}T13:00`);
  const [end, setEnd] = useState(`${date}T14:00`);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  function extractDateAndTime(value: string) {
    if (!value) return { date: '', time: '' };
    const [datePart = '', timePart = ''] = value.split('T');
    const time = timePart.slice(0, 5);
    return { date: datePart, time };
  }

  async function submit() {
    if (!deviceId) {
      toast.error('機器を選択してください');
      return;
    }
    setSaving(true);
    try {
      const { date: startDate, time: startTime } = extractDateAndTime(start);
      const { date: endDate, time: endTime } = extractDateAndTime(end);
      if (!startDate || !startTime || !endTime || startDate !== endDate) {
        toast.error('同じ日の開始・終了時刻を入力してください');
        return;
      }
      const payload = {
        groupSlug: slug,
        deviceId,
        date: startDate,
        start: startTime,
        end: endTime,
      };
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'same-origin',
      });
      if (!res.ok) {
        const { message } = await res.json().catch(() => ({ message: '作成に失敗しました' }));
        toast.error(`作成失敗: ${message}`);
        return;
      }
      toast.success('予約を作成しました');
      router.push(`/groups/${slug}`);
    } catch (err) {
      const message =
        (err && typeof err === 'object' && 'message' in err && typeof (err as any).message === 'string'
          ? (err as any).message
          : '') || '作成に失敗しました';
      toast.error(`作成失敗: ${message}`);
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
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              className="w-full border rounded-lg p-2"
            >
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
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
