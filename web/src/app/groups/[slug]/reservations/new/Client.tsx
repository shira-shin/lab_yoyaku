'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { z } from 'zod';
import { toast } from '@/lib/toast';
import { localInputToUTC, toUtcIsoZ } from '@/lib/time';

const ReservationFormSchema = z
  .object({
    deviceSlug: z.string().min(1, '機器を選択してください'),
    start: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, '開始時刻を正しく入力してください')
      .transform((value) => toUtcIsoZ(localInputToUTC(value))),
    end: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, '終了時刻を正しく入力してください')
      .transform((value) => toUtcIsoZ(localInputToUTC(value))),
    purpose: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (new Date(value.end).getTime() <= new Date(value.start).getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['end'],
        message: '終了は開始より後にしてください',
      });
    }
  });

function buildDefaultValue(param: string | null, time: string) {
  if (!param || !/^\d{4}-\d{2}-\d{2}$/.test(param)) return '';
  if (!/^\d{2}:\d{2}$/.test(time)) return '';
  return `${param}T${time}`;
}

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
  const dateParam = sp.get('date');
  const [deviceSlug, setDeviceSlug] = useState(defaultDevice);
  const sorted = useMemo(
    () => devices.slice().sort((a, b) => a.name.localeCompare(b.name)),
    [devices]
  );

  const defaultStartValue = useMemo(
    () => buildDefaultValue(dateParam, '13:00'),
    [dateParam]
  );
  const defaultEndValue = useMemo(
    () => buildDefaultValue(dateParam, '14:00'),
    [dateParam]
  );

  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const deviceValue = deviceSlug || String(fd.get('device') || '');
    const purposeRaw = fd.get('purpose');
    const parsed = ReservationFormSchema.safeParse({
      deviceSlug: deviceValue,
      start: String(fd.get('start') || ''),
      end: String(fd.get('end') || ''),
      purpose: typeof purposeRaw === 'string' ? purposeRaw : undefined,
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

    const payloadFromSchema = parsed.data;
    const purpose = payloadFromSchema.purpose?.trim() ?? '';
    const startsAtUTC = payloadFromSchema.start;
    const endsAtUTC = payloadFromSchema.end;
    const payload = {
      groupSlug: params.slug,
      deviceSlug: payloadFromSchema.deviceSlug,
      startsAtUTC,
      endsAtUTC,
      purpose,
    };

    setSubmitting(true);
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'same-origin',
        cache: 'no-store',
      });
      const j = await res.json().catch(() => ({}));
      if (res.status === 401) {
        toast.error('認証が必要です。ページを再読み込みしてください。');
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
            defaultValue={defaultStartValue}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">終了 *</label>
          <input
            name="end"
            type="datetime-local"
            required
            className="w-full rounded-xl border px-3 py-2"
            defaultValue={defaultEndValue}
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
