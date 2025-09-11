'use client';

import { useState } from 'react';
import { makeSlug } from '@/lib/slug';
import { useRouter } from 'next/navigation';

export default function NewGroupPage() {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [reserveFrom, setReserveFrom] = useState('');
  const [reserveTo, setReserveTo] = useState('');
  const [memo, setMemo] = useState('');
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const res = await fetch('/api/me/groups', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          slug: makeSlug(name),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j?.error || '作成に失敗しました');
        return;
      }
      const data = await res.json();
      router.push(`/groups/${data.slug}`);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">グループ作成</h1>
        <a href="/" className="rounded-lg border px-3 py-2 hover:bg-gray-100">ホームに戻る</a>
      </div>
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
          <div className="mb-1">パスワード</div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border p-3"
            required
          />
        </label>
        <div className="pt-2">
          <div className="text-lg font-semibold mb-2">詳細設定</div>
          <p className="text-sm text-muted mb-4">
            予約期間の制限などについては
            <a
              href="/usage/reservation-settings"
              className="text-blue-600 hover:underline ml-1"
            >
              こちら
            </a>
            を参照してください。
          </p>
          <label className="block">
            <div className="mb-1">予約開始（任意）</div>
            <input
              type="datetime-local"
              value={reserveFrom}
              onChange={(e) => setReserveFrom(e.target.value)}
              className="w-full rounded-xl border p-3"
            />
          </label>
          <label className="block">
            <div className="mb-1">予約終了（任意）</div>
            <input
              type="datetime-local"
              value={reserveTo}
              onChange={(e) => setReserveTo(e.target.value)}
              className="w-full rounded-xl border p-3"
            />
          </label>
          <label className="block">
            <div className="mb-1">メモ（任意）</div>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="w-full rounded-xl border p-3"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-primary hover:bg-primary-dark text-white px-5 py-2"
        >
          作成する
        </button>
      </form>
    </main>
  );
}
