'use client';

import { useState } from 'react';
import CopyButton from './CopyButton';

type PasswordPanelProps = {
  slug: string;
  hasPassword: boolean;
};

export default function PasswordPanel({ slug, hasPassword }: PasswordPanelProps) {
  const [plain, setPlain] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rotate = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/groups/${encodeURIComponent(slug)}/admin/rotate-password`,
        { method: 'POST', cache: 'no-store' },
      );
      if (!res.ok) {
        setError('パスワードの再発行に失敗しました。');
        return;
      }
      const data = await res.json().catch(() => null);
      setPlain(typeof data?.password === 'string' ? data.password : null);
    } catch (err) {
      console.error('Failed to rotate password', err);
      setError('パスワードの再発行に失敗しました。');
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="rounded-xl border p-4 space-y-2">
      <h2 className="font-semibold">参加パスワード</h2>
      <p className="text-sm text-gray-600">
        セキュリティのためパスワードはハッシュ保存です。既存の平文は表示できません。
        再発行すると<strong>一度だけ</strong>新しい平文を表示します。
      </p>
      <div>現在の設定：{hasPassword ? 'あり' : 'なし'}</div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      {plain ? (
        <div className="bg-yellow-50 border border-yellow-300 rounded p-3 space-y-1">
          <div>
            新しいパスワード：<code className="font-mono">{plain}</code>{' '}
            <CopyButton text={plain} />
          </div>
          <div className="text-xs text-gray-500">※この画面を離れると再表示できません。</div>
        </div>
      ) : (
        <button
          type="button"
          onClick={rotate}
          disabled={pending}
          className="rounded bg-indigo-600 text-white px-3 py-2 text-sm disabled:opacity-60"
        >
          {pending ? '再発行中…' : 'パスワードを再発行して表示'}
        </button>
      )}
    </section>
  );
}
