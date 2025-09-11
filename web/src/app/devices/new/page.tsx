'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createDevice } from '@/lib/api';

export default function NewDevicePage() {
  const search = useSearchParams();
  const router = useRouter();
  const [group, setGroup] = useState('');
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [existing, setExisting] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const g = search.get('group');
    if (g) setGroup(g);
  }, [search]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload: any = { slug: group, name, note };
      if (existing) payload.deviceSlug = existing;
      await createDevice(payload);
      router.push(`/groups/${group}`);
    } catch (err: any) {
      setError(err?.message || '登録に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <h1 className="text-2xl font-bold">機器登録</h1>
      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          value={group}
          onChange={(e) => setGroup(e.target.value)}
          placeholder="グループslug"
          className="input w-full"
          required
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="機器名"
          className="input w-full"
          required
        />
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="使用上の注意"
          className="input w-full"
        />
        <input
          value={existing}
          onChange={(e) => setExisting(e.target.value)}
          placeholder="既存の機器コード（任意）"
          className="input w-full"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 px-4 py-2"
        >
          登録
        </button>
      </form>
      {error && <div className="text-sm text-red-600">{error}</div>}
    </div>
  );
}
