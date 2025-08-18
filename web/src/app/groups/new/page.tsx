'use client';
import { useState } from 'react';
import Button from '@/components/ui/Button';

export default function GroupNew() {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await fetch('/api/mock/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, slug }),
    });
    if (r.ok) {
      alert('グループを作成しました');
      setName('');
      setSlug('');
    } else {
      const err = await r.json();
      alert(err.error ?? 'エラー');
    }
  };

  return (
    <main className="max-w-md space-y-4">
      <h1 className="text-2xl font-bold">グループ作成</h1>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">名称</label>
          <input value={name} onChange={e=>setName(e.target.value)} className="w-full rounded border p-2" required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">slug</label>
          <input value={slug} onChange={e=>setSlug(e.target.value)} className="w-full rounded border p-2" required />
        </div>
        <Button type="submit" variant="primary">作成</Button>
      </form>
    </main>
  );
}
