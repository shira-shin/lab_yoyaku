'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/Button';

export default function ProfileClient({
  initialName,
  email,
}: {
  initialName: string;
  email: string;
}) {
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/me/profile', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name }),
        credentials: 'same-origin',
      });
      if (!res.ok) throw new Error('failed');
      toast.success('保存しました');
      router.refresh();
    } catch (e) {
      toast.error('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <div className="mb-1">メールアドレス</div>
        <input
          value={email}
          readOnly
          className="input w-full bg-gray-100 text-gray-500"
        />
      </label>
      <label className="block">
        <div className="mb-1">表示名</div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input w-full"
        />
      </label>
      <Button type="submit" variant="primary" loading={saving} block>
        保存
      </Button>
    </form>
  );
}
