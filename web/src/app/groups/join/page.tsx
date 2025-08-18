'use client';
import { useState } from 'react';
import Button from '@/components/ui/Button';

export default function GroupJoin() {
  const [code, setCode] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await fetch('/api/mock/groups/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    if (r.ok) {
      alert('参加できました');
      setCode('');
    } else {
      alert('コードが無効です');
    }
  };

  return (
    <main className="max-w-md space-y-4">
      <h1 className="text-2xl font-bold">グループに参加</h1>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">招待コード</label>
          <input value={code} onChange={e=>setCode(e.target.value)} className="w-full rounded border p-2" required />
        </div>
        <Button type="submit" variant="primary">参加する</Button>
      </form>
    </main>
  );
}
