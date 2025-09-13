'use client';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ClientPage({ params }: { params: { slug: string } }) {
  const r = useRouter();
  const sp = useSearchParams();
  const defaultDevice = sp.get('device') ?? '';
  const defaultDate = sp.get('date') ?? '';

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      group: params.slug,
      device: String(fd.get('device') || defaultDevice),
      start: String(fd.get('start') || ''),
      end: String(fd.get('end') || ''),
      purpose: String(fd.get('purpose') || ''),
    };
    const res = await fetch(`/api/mock/groups/${encodeURIComponent(params.slug)}/reservations`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
    const json = await res.json().catch(() => ({} as any));
    if (res.status === 401) {
      location.assign(`/login?next=/groups/${params.slug}/reservations/new`);
      return;
    }
    if (!res.ok) {
      alert(json?.error ?? `HTTP ${res.status}`);
      return;
    }
    r.push(`/groups/${params.slug}?device=${encodeURIComponent(payload.device)}`);
  }
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-4">予約を追加</h1>
      <form onSubmit={onSubmit} className="rounded-2xl border p-6 space-y-5 bg-white">
        <div>
          <label className="block text-sm font-medium mb-1">
            機器 <span className="text-red-600">*</span>
          </label>
          <input
            name="device"
            defaultValue={defaultDevice}
            className="w-full rounded-xl border px-3 py-2"
            placeholder="例: pcr"
            required
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              開始 <span className="text-red-600">*</span>
            </label>
            <input
              name="start"
              type="datetime-local"
              className="w-full rounded-xl border px-3 py-2"
              defaultValue={defaultDate ? `${defaultDate}T09:00` : ''}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              終了 <span className="text-red-600">*</span>
            </label>
            <input
              name="end"
              type="datetime-local"
              className="w-full rounded-xl border px-3 py-2"
              defaultValue={defaultDate ? `${defaultDate}T10:00` : ''}
              required
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
    </div>
  );
}
