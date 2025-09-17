'use client';

import { useRouter, useSearchParams } from 'next/navigation';

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function DeviceNewClient({ slug }: { slug: string }) {
  const r = useRouter();
  useSearchParams();
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get('name') || '').trim();
    if (!name) {
      alert('機器名は必須です');
      return;
    }
    const deviceSlug = slugify(name);
    const res = await fetch(`/api/groups/${encodeURIComponent(slug)}/devices`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name,
        slug: deviceSlug,
        caution: String(fd.get('caution') || ''),
        code: String(fd.get('code') || ''),
      }),
    });
    const json = await res.json().catch(() => ({} as any));
    if (!res.ok) {
      alert(json?.error ?? `HTTP ${res.status}`);
      return;
    }
    r.push(`/groups/${slug}`);
  }
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-4">機器登録</h1>
      <form onSubmit={onSubmit} className="rounded-2xl border p-6 space-y-5 bg-white">
        <div>
          <label className="block text-sm font-medium mb-1">
            機器名 <span className="text-red-600">*</span>
          </label>
          <input
            name="name"
            className="w-full rounded-xl border px-3 py-2"
            placeholder="例: PCR"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">使用上の注意（任意）</label>
          <textarea
            name="caution"
            rows={3}
            className="w-full rounded-xl border px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">既存コード（任意）</label>
          <input name="code" className="w-full rounded-xl border px-3 py-2" />
        </div>
        <div className="flex gap-2">
          <button className="btn btn-primary" type="submit">
            登録
          </button>
          <a className="btn btn-secondary" href={`/groups/${slug}`}>
            キャンセル
          </a>
        </div>
      </form>
    </div>
  );
}
