'use client';
import { useState } from 'react';
import { toast } from '@/lib/toast';

export default function ProfileClient({ initialDisplayName }: { initialDisplayName: string }) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/me/profile', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ displayName }),
      });
      if (!res.ok) throw new Error('failed');
      toast.success('保存しました');
    } catch (e) {
      toast.error('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <div className="mb-1">表示名</div>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="input w-full"
        />
      </label>
      <button className="btn btn-primary" disabled={saving} type="submit">
        保存
      </button>
    </form>
  );
}
