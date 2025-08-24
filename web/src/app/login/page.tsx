'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

type Tab = 'login' | 'register';

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get('next') || '/';
  const [tab, setTab] = useState<Tab>('login');

  // login state
  const [lemail, setLEmail] = useState('');
  const [lpass, setLPass] = useState('');
  const [lerr, setLErr] = useState('');

  // register state
  const [rname, setRName] = useState('');
  const [remail, setREmail] = useState('');
  const [rpass, setRPass] = useState('');
  const [rpass2, setRPass2] = useState('');
  const [rerr, setRErr] = useState('');

  async function submitLogin(e: React.FormEvent) {
    e.preventDefault(); setLErr('');
    const res = await fetch('/api/auth/login', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ email: lemail, password: lpass })
    });
    if (res.ok) router.replace(next);
    else setLErr('メールまたはパスワードが違います');
  }

  async function submitRegister(e: React.FormEvent) {
    e.preventDefault(); setRErr('');
    if (rpass !== rpass2) { setRErr('確認用パスワードが一致しません'); return; }
    const res = await fetch('/api/auth/register', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ email: remail, password: rpass, name: rname })
    });
    if (res.ok) router.replace(next);
    else {
      const t = await res.text();
      setRErr(/already/.test(t) ? 'このメールアドレスは既に登録されています' : '登録に失敗しました');
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-8">
      {/* 説明 */}
      <header className="text-center">
        <h1 className="text-3xl font-bold">Lab Yoyaku へようこそ</h1>
        <p className="text-gray-600 mt-2">
          研究室の機器をグループ単位で管理し、利用状況や予約をカレンダーで可視化。QRコードで機器別ページにアクセスできます。
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          {t:'① グループを作成', d:'研究室/班ごとにグループ化し、メンバーを招待します。'},
          {t:'② グループに参加', d:'招待リンク/QRから参加。機器一覧とカレンダーが使えます。'},
          {t:'③ 機器登録 & カレンダー', d:'機器ごとにQRを発行し、予約・使用中がひと目で分かります。'},
        ].map((c,i)=>(
          <div key={i} className="rounded-xl border p-4">
            <div className="font-semibold mb-1">{c.t}</div>
            <div className="text-sm text-gray-600">{c.d}</div>
          </div>
        ))}
      </div>

      {/* タブ */}
      <div className="max-w-xl mx-auto">
        <div className="flex border-b mb-4">
          <button
            className={`px-4 py-2 ${tab==='login' ? 'border-b-2 border-black font-semibold' : 'text-gray-500'}`}
            onClick={()=>setTab('login')}
          >ログイン</button>
          <button
            className={`px-4 py-2 ${tab==='register' ? 'border-b-2 border-black font-semibold' : 'text-gray-500'}`}
            onClick={()=>setTab('register')}
          >新規作成</button>
        </div>

        {tab==='login' && (
          <form onSubmit={submitLogin} className="space-y-3">
            <input className="w-full rounded border px-3 py-2" placeholder="メールアドレス"
                   value={lemail} onChange={e=>setLEmail(e.target.value)} />
            <input className="w-full rounded border px-3 py-2" type="password" placeholder="パスワード"
                   value={lpass} onChange={e=>setLPass(e.target.value)} />
            {lerr && <div className="text-sm text-red-600">{lerr}</div>}
            <button className="rounded bg-black text-white px-4 py-2">ログイン</button>
            <p className="text-xs text-gray-500 mt-2">デモ: <b>demo / demo</b> でもログインできます。</p>
          </form>
        )}

        {tab==='register' && (
          <form onSubmit={submitRegister} className="space-y-3">
            <input className="w-full rounded border px-3 py-2" placeholder="表示名（任意）"
                   value={rname} onChange={e=>setRName(e.target.value)} />
            <input className="w-full rounded border px-3 py-2" placeholder="メールアドレス"
                   value={remail} onChange={e=>setREmail(e.target.value)} required />
            <input className="w-full rounded border px-3 py-2" type="password" placeholder="パスワード（6文字以上）"
                   value={rpass} onChange={e=>setRPass(e.target.value)} required />
            <input className="w-full rounded border px-3 py-2" type="password" placeholder="パスワード（確認）"
                   value={rpass2} onChange={e=>setRPass2(e.target.value)} required />
            {rerr && <div className="text-sm text-red-600">{rerr}</div>}
            <button className="rounded bg-black text-white px-4 py-2">アカウントを作成</button>
          </form>
        )}
      </div>
    </div>
  );
}
