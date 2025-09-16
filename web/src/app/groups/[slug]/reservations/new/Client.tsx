'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';

export default function NewReservationClient({
  params,
  devices,
}: {
  params: { slug: string };
  devices: Array<{ slug: string; name: string; id: string }>;
}) {
  const r = useRouter();
  const sp = useSearchParams();
  const defaultDevice = sp.get('device') ?? '';
  const [deviceSlug, setDeviceSlug] = useState(defaultDevice);
  const sorted = useMemo(
    () => devices.slice().sort((a, b) => a.name.localeCompare(b.name)),
    [devices]
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const startValue = String(fd.get('start') || '');
    const endValue = String(fd.get('end') || '');
    const purpose = String(fd.get('purpose') || '');
    const startAt = new Date(startValue);
    const endAt = new Date(endValue);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      alert('開始と終了の日時を正しく入力してください');
      return;
    }
    if (startAt >= endAt) {
      alert('開始は終了より前である必要があります');
      return;
    }

    const deviceValue = deviceSlug || String(fd.get('device') || '');
    if (!deviceValue) {
      alert('機器を選択してください');
      return;
    }

    const payload = {
      groupSlug: params.slug,
      deviceSlug: deviceValue,
      start: startAt.toISOString(),
      end: endAt.toISOString(),
      purpose,
    };

    const res = await fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const j = await res.json().catch(() => ({}));
    if (res.status === 401) {
      location.assign(`/login?next=/groups/${params.slug}/reservations/new`);
      return;
    }
    if (!res.ok) {
      alert(j?.error ?? '予約の作成に失敗しました');
      return;
    }
    const nextDevice = payload.deviceSlug;
    r.push(
      `/groups/${params.slug}${
        nextDevice ? `?device=${encodeURIComponent(nextDevice)}` : ''
      }`
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="max-w-3xl rounded-2xl border p-6 bg-white space-y-5"
    >
      <div>
        <label className="block text-sm font-medium mb-1">機器 *</label>
        <select
          name="device"
          value={deviceSlug}
          onChange={(event) => setDeviceSlug(event.target.value)}
          required
          className="w-full rounded-xl border px-3 py-2"
        >
          <option value="" disabled>
            選択してください
          </option>
          {sorted.map((d) => (
            <option key={d.slug} value={d.slug}>
              {d.name} ({d.slug})
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">開始 *</label>
          <input
            name="start"
            type="datetime-local"
            required
            className="w-full rounded-xl border px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">終了 *</label>
          <input
            name="end"
            type="datetime-local"
            required
            className="w-full rounded-xl border px-3 py-2"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">用途（任意）</label>
        <textarea
          name="purpose"
          rows={3}
          className="w-full rounded-xl border px-3 py-2"
        />
      </div>
      <div className="flex gap-2">
        <button className="btn btn-primary" type="submit">
          作成
        </button>
        <a className="btn btn-secondary" href={`/groups/${params.slug}`}>
          キャンセル
        </a>
      </div>
    </form>
  );
}
