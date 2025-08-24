'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { LogIn, UserPlus } from 'lucide-react'; // npm i lucide-react

type Tab = 'login' | 'register';

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get('next') || '/';
  const [tab, setTab] = useState<Tab>('login');

  // login
  const [lemail, setLEmail] = useState('');
  const [lpass, setLPass] = useState('');
  const [lerr, setLErr] = useState('');
  const [loadingLogin, setLoadingLogin] = useState(false);

  // register
  const [rname, setRName] = useState('');
  const [remail, setREmail] = useState('');
  const [rpass, setRPass] = useState('');
  const [rpass2, setRPass2] = useState('');
  const [rerr, setRErr] = useState('');
  const [loadingReg, setLoadingReg] = useState(false);

  async function submitLogin(e: React.FormEvent) {
    e.preventDefault(); setLErr(''); setLoadingLogin(true);
    try {
      const res = await fetch('/api/auth/login', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ email: lemail, password: lpass })
      });
      if (!res.ok) throw new Error();
      // ✅ 成功したらホームへ（next があれば next、なければ /）
      router.replace(next || '/');
    } catch {
      setLErr('メールまたはパスワードが違います');
    } finally {
      setLoadingLogin(false);
    }
  }

  async function submitRegister(e: React.FormEvent) {
    e.preventDefault(); setRErr('');
    if (rpass !== rpass2) { setRErr('確認用パスワードが一致しません'); return; }
    setLoadingReg(true);
    try {
      const res = await fetch('/api/auth/register', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ email: remail, password: rpass, name: rname })
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(/already/.test(t) ? 'このメールは登録済みです' : '登録に失敗しました');
      }
      // ✅ 成功したらホームへ
      router.replace('/');
    } catch (e: any) {
      setRErr(e?.message ?? '登録に失敗しました');
    } finally {
      setLoadingReg(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-48px)] bg-gradient-to-b from-sky-50 to-white">
      <div className="mx-auto max-w-4xl px-4 py-12">
        {/* ヒーロー */}
        <header className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight">Lab Yoyaku へようこそ</h1>
          <p className="text-gray-600 mt-2">
            研究室の機器をグループで管理し、予約と使用状況をカレンダーで可視化。QRコードで機器ページへも即アクセス。
          </p>
        </header>

        {/* 説明カード */}
        <div className="grid gap-4 md:grid-cols-3 mb-10">
          {[
            {t:'① グループを作成', d:'研究室/班ごとに立ち上げ、メンバーを招待。'},
            {t:'② グループに参加', d:'招待リンク/QRから参加。機器一覧とカレンダーを共有。'},
            {t:'③ 機器登録 & 予約', d:'機器ごとにQR発行、予約・使用中がすぐ分かる。'},
          ].map((c,i)=>(
            <div key={i} className="rounded-2xl border shadow-sm bg-white p-4">
              <div className="font-semibold mb-1">{c.t}</div>
              <div className="text-sm text-gray-600">{c.d}</div>
            </div>
          ))}
        </div>

        {/* タブ */}
        <div className="mx-auto max-w-xl bg-white rounded-2xl border shadow-sm p-6">
          <div className="inline-flex rounded-full bg-gray-100 p-1 mb-6">
            <button
              className={`px-4 py-2 rounded-full text-sm transition ${
                tab==='login' ? 'bg-white shadow-sm font-semibold' : 'text-gray-500'
              }`}
              onClick={()=>setTab('login')}
            >
              <span className="inline-flex items-center gap-2"><LogIn size={16}/> ログイン</span>
            </button>
            <button
              className={`px-4 py-2 rounded-full text-sm transition ${
                tab==='register' ? 'bg-white shadow-sm font-semibold' : 'text-gray-500'
              }`}
              onClick={()=>setTab('register')}
            >
              <span className="inline-flex items-center gap-2"><UserPlus size={16}/> 新規作成</span>
            </button>
          </div>

          {tab==='login' && (
            <form onSubmit={submitLogin} className="space-y-3">
              <input className="w-full rounded-xl border px-3 py-2" placeholder="メールアドレス"
                     value={lemail} onChange={e=>setLEmail(e.target.value)} required />
              <input className="w-full rounded-xl border px-3 py-2" type="password" placeholder="パスワード"
                     value={lpass} onChange={e=>setLPass(e.target.value)} required />
              {lerr && <div className="text-sm text-red-600">{lerr}</div>}
              <button
                className="w-full rounded-xl bg-sky-600 text-white px-4 py-2 font-semibold hover:bg-sky-700 transition disabled:opacity-60"
                disabled={loadingLogin}
              >
                {loadingLogin ? 'ログイン中…' : 'ログイン'}
              </button>
              <p className="text-xs text-gray-500 text-center">デモ: <b>demo / demo</b> でもログインできます。</p>
            </form>
          )}

          {tab==='register' && (
            <form onSubmit={submitRegister} className="space-y-3">
              <input className="w-full rounded-xl border px-3 py-2" placeholder="表示名（任意）"
                     value={rname} onChange={e=>setRName(e.target.value)} />
              <input className="w-full rounded-xl border px-3 py-2" placeholder="メールアドレス"
                     value={remail} onChange={e=>setREmail(e.target.value)} required />
              <input className="w-full rounded-xl border px-3 py-2" type="password" placeholder="パスワード（6文字以上）"
                     value={rpass} onChange={e=>setRPass(e.target.value)} required />
              <input className="w-full rounded-xl border px-3 py-2" type="password" placeholder="パスワード（確認）"
                     value={rpass2} onChange={e=>setRPass2(e.target.value)} required />
              {rerr && <div className="text-sm text-red-600">{rerr}</div>}
              <button
                className="w-full rounded-xl bg-indigo-600 text-white px-4 py-2 font-semibold hover:bg-indigo-700 transition disabled:opacity-60"
                disabled={loadingReg}
              >
                {loadingReg ? '作成中…' : 'アカウントを作成'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
