'use client';
import { useSearchParams } from 'next/navigation';

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function DeviceNew() {
  const search = useSearchParams();
  const group = (search.get('group') || '').toLowerCase();
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get('name') || '').trim();
    if (!name) {
      alert('機器名は必須です');
      return;
    }
    const payload = {
      slug: group,
      name,
      caution: String(fd.get('caution') || ''),
      code: String(fd.get('code') || ''),
        deviceSlug: slugify(name),
    };
    const res = await fetch('/api/mock/devices', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
    const json = await res.json().catch(() => ({} as any));
    if (!res.ok) {
      alert(json?.error ?? `HTTP ${res.status}`);
      return;
    }
    const slug = json?.device?.slug ?? payload.deviceSlug;
    location.assign(`/devices/${encodeURIComponent(slug)}`);
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-4">機器登録</h1>
      <form onSubmit={onSubmit} className="rounded-2xl border p-6 space-y-5 bg-white">
        <div>
          <label className="block text-sm font-medium mb-1">機器名 <span className="text-red-600">*</span></label>
          <input name="name" className="w-full rounded-xl border px-3 py-2" placeholder="例: PCR" required />
          <p className="mt-1 text-xs text-zinc-500">URL用のスラッグは自動生成（小文字）</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">使用上の注意（任意）</label>
          <textarea name="caution" rows={4} className="w-full rounded-xl border px-3 py-2"
            placeholder="例: 使用後はキットを補充してください" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">既存の機器コード（任意）</label>
          <input name="code" className="w-full rounded-xl border px-3 py-2" placeholder="例: DEV-001" />
        </div>

        <div className="flex gap-2">
          <button className="btn btn-primary" type="submit">登録</button>
          <a className="btn btn-secondary" href="/groups">キャンセル</a>
        </div>
      </form>
    </div>
  );
}
