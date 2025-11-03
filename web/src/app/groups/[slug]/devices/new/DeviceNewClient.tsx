'use client';

import SubmitBar from '@/components/SubmitBar';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRef, useState } from 'react';

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function DeviceNewClient({ slug }: { slug: string }) {
  const r = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  useSearchParams();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) {
      return;
    }
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get('name') || '').trim();
    if (!name) {
      alert('機器名は必須です');
      setLoading(false);
      return;
    }
    const deviceSlug = slugify(name);

    try {
      const res = await fetch(`/api/groups/${encodeURIComponent(slug)}/devices`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name,
          slug: deviceSlug,
          caution: String(fd.get('caution') || ''),
          code: String(fd.get('code') || ''),
        }),
        credentials: 'same-origin',
      });
      const json = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        alert(json?.error ?? `HTTP ${res.status}`);
        return;
      }
      r.push(`/groups/${slug}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">機器登録</h1>
      <form
        ref={formRef}
        onSubmit={onSubmit}
        className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-800">
            機器名 <span className="text-red-600">*</span>
          </label>
          <input
            name="name"
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-base focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300/60"
            placeholder="例: PCR"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-800">使用上の注意（任意）</label>
          <textarea
            name="caution"
            rows={3}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-base focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300/60"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-800">既存コード（任意）</label>
          <input
            name="code"
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-base focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300/60"
          />
        </div>
      </form>

      <SubmitBar
        onSubmit={() => formRef.current?.requestSubmit()}
        submitLabel="登録"
        cancelHref={`/groups/${slug}`}
        loading={loading}
        disabled={loading}
      />
    </div>
  );
}
