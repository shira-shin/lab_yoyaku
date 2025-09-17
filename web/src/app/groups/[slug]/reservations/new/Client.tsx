'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from '@/lib/toast';
import { z } from 'zod';

const ReservationFormSchema = z.object({
  deviceSlug: z.string().min(1),
  start: z.coerce.date(),
  end: z.coerce.date(),
  purpose: z.string().optional(),
});

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

  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const deviceValue = deviceSlug || String(fd.get('device') || '');
    const parsed = ReservationFormSchema.safeParse({
      deviceSlug: deviceValue,
      start: String(fd.get('start') || ''),
      end: String(fd.get('end') || ''),
      purpose: String(fd.get('purpose') ?? ''),
    });

    if (!parsed.success) {
      const flattened = 'error' in parsed ? parsed.error.flatten() : { formErrors: ['入力内容を確認してください'], fieldErrors: {} };
      const message =
        flattened.formErrors[0] ||
        Object.values(flattened.fieldErrors)[0]?.[0] ||
        '入力内容を確認してください';
      toast.error(message);
      return;
    }

    const { start, end } = parsed.data;
    const purpose = parsed.data.purpose?.trim() ?? '';
    if (start >= end) {
      toast.error('終了時刻は開始時刻より後に設定してください');
      return;
    }

    const payload = {
      groupSlug: params.slug,
      deviceSlug: parsed.data.deviceSlug,
      start: start.toISOString(),
      end: end.toISOString(),
      purpose,
    };

    setSubmitting(true);
    try {
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
      if (res.status === 409) {
        toast.error('既存の予約と時間が重複しています');
        return;
      }
      if (!res.ok) {
        const errorMessage =
          (typeof j?.error === 'string' && j.error) ||
          j?.error?.formErrors?.[0] ||
          '予約の作成に失敗しました';
        toast.error(errorMessage);
        return;
      }
      toast.success('予約を作成しました');
      const nextDevice = payload.deviceSlug;
      r.push(
        `/groups/${params.slug}${
          nextDevice ? `?device=${encodeURIComponent(nextDevice)}` : ''
        }`
      );
      r.refresh();
    } catch (error) {
      toast.error('予約の作成に失敗しました');
    } finally {
      setSubmitting(false);
    }
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
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? '作成中…' : '作成'}
        </button>
        <a className="btn btn-secondary" href={`/groups/${params.slug}`}>
          キャンセル
        </a>
      </div>
    </form>
  );
}
