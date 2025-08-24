'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createGroup } from '@/lib/api';

export default function NewGroupPage() {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const res = await createGroup({ name: name.trim(), slug: slug.trim(), password });
      if (res?.ok && res.data?.slug) {
        router.push(`/groups/${res.data.slug}`);
        router.refresh();
      } else {
        alert(res?.error || '作成に失敗しました');
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="max-w-2xl p-6 space-y-6">
      <h1 className="text-3xl font-bold">グループ作成</h1>
      <form onSubmit={onSubmit} className="space-y-5">
        <label className="block">
          <div className="mb-1">名称</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border p-3"
            required
          />
        </label>
        <label className="block">
          <div className="mb-1">slug</div>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="w-full rounded-xl border p-3"
            required
          />
        </label>
        <label className="block">
          <div className="mb-1">パスワード</div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border p-3"
            required
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-black text-white px-5 py-2"
        >
          作成
        </button>
      </form>
    </main>
  );
}
