'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get('next') || '/';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (res.ok) router.replace(next);
    else setErr('ユーザー名またはパスワードが違います');
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-8">
      <header className="text-center">
        <h1 className="text-3xl font-bold">Lab Yoyaku へようこそ</h1>
        <p className="text-gray-600 mt-2">
          研究室の機器をグループ単位で管理し、利用状況や予約をカレンダーで可視化。QRコードで機器別ページにアクセスできます。
        </p>
      </header>

      {/* 説明カード */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          {t:'① グループを作成', d:'研究室/班ごとにグループ化して立ち上げ、メンバーを招待します。'},
          {t:'② グループに参加', d:'招待リンク/QRコードから参加。機器一覧とカレンダーが使えます。'},
          {t:'③ 機器登録 & カレンダー', d:'機器ごとにQRを発行し、予約・使用中がひと目で分かります。'},
        ].map((c,i)=>(
          <div key={i} className="rounded-xl border p-4">
            <div className="font-semibold mb-1">{c.t}</div>
            <div className="text-sm text-gray-600">{c.d}</div>
          </div>
        ))}
      </div>

      {/* ログイン */}
      <section className="max-w-md">
        <h2 className="text-xl font-semibold mb-3">ログイン</h2>
        <form onSubmit={onSubmit} className="space-y-3">
          <input className="w-full rounded border px-3 py-2" placeholder="ユーザー名"
                 value={username} onChange={e=>setUsername(e.target.value)} />
          <input className="w-full rounded border px-3 py-2" type="password" placeholder="パスワード"
                 value={password} onChange={e=>setPassword(e.target.value)} />
          {err && <div className="text-sm text-red-600">{err}</div>}
          <button className="rounded bg-black text-white px-4 py-2">ログイン</button>
        </form>
        <p className="text-xs text-gray-500 mt-2">デモ環境では <b>demo / demo</b> でログインできます。</p>
      </section>
    </div>
  );
}

