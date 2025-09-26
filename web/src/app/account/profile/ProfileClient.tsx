'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from '@/lib/toast';

export default function ProfileClient({
  initialDisplayName,
  email,
}: {
  initialDisplayName: string;
  email: string;
}) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/me/profile', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          displayName,
          currentPassword,
          newPassword,
          confirmPassword,
        }),
        credentials: 'same-origin',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const message =
          (typeof body?.error === 'string' && body.error) ||
          '保存に失敗しました';
        throw new Error(message);
      }
      toast.success('保存しました');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '保存に失敗しました');
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
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="input w-full"
        />
      </label>
      <div className="border-t pt-4 space-y-3">
        <div className="font-medium">パスワードを変更</div>
        <p className="text-sm text-neutral-500">
          現在のパスワードと新しいパスワード（確認）を入力してください。
        </p>
        <label className="block">
          <div className="mb-1">現在のパスワード</div>
          <input
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            type="password"
            className="input w-full"
            placeholder="変更しない場合は空のまま"
          />
        </label>
        <label className="block">
          <div className="mb-1">新しいパスワード</div>
          <input
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            type="password"
            className="input w-full"
            placeholder="6文字以上"
          />
        </label>
        <label className="block">
          <div className="mb-1">新しいパスワード（確認）</div>
          <input
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            type="password"
            className="input w-full"
          />
        </label>
      </div>
      <button className="btn btn-primary" disabled={saving} type="submit">
        保存
      </button>
    </form>
  );
}
