'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function NewGroupForm() {
  const r = useRouter();
  const [auth, setAuth] = useState<'checking' | 'ok' | 'unauth'>('checking');

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((res) => res.json())
      .then((d) => setAuth(d.ok ? 'ok' : 'unauth'))
      .catch(() => setAuth('unauth'));
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get('name') || '').trim(),
      password: String(fd.get('password') || ''),
      reserveFrom: fd.get('startAt') || null,
      reserveTo: fd.get('endAt') || null,
      memo: String(fd.get('memo') || ''),
    };
    const res = await fetch('/api/mock/groups', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
    const slug = json?.group?.slug ?? json?.slug ?? payload.name.toLowerCase();
    r.push(`/groups/${encodeURIComponent(slug)}`);
  }

  if (auth === 'checking') return <p>確認中…</p>;
  if (auth === 'unauth') {
    return (
      <div className="space-y-3">
        <p>グループ作成にはログインが必要です。</p>
        <a className="underline" href="/login?next=/groups/new">ログインへ</a>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <label className="block">
        <div className="mb-1">名称</div>
        <input name="name" className="w-full rounded-xl border p-3" required />
      </label>
      <label className="block">
        <div className="mb-1">パスワード</div>
        <input type="password" name="password" className="w-full rounded-xl border p-3" required />
      </label>
      <div className="pt-2 space-y-4">
        <label className="block">
          <div className="mb-1">予約開始（任意）</div>
          <input type="datetime-local" name="startAt" className="w-full rounded-xl border p-3" />
        </label>
        <label className="block">
          <div className="mb-1">予約終了（任意）</div>
          <input type="datetime-local" name="endAt" className="w-full rounded-xl border p-3" />
        </label>
        <label className="block">
          <div className="mb-1">メモ（任意）</div>
          <textarea name="memo" className="w-full rounded-xl border p-3" />
        </label>
      </div>
      <button type="submit" className="rounded-xl px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-500">
        グループを作る
      </button>
    </form>
  );
}
