"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const [username, setU] = useState("");
  const [password, setP] = useState("");
  const [loading, setL] = useState(false);
  const [error, setE] = useState("");
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setE("");
    setL(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "ログインに失敗しました");
      router.push(next);
      router.refresh();
    } catch (err: any) {
      setE(err.message || "ログインに失敗しました");
    } finally {
      setL(false);
    }
  };

  return (
    <main className="mx-auto max-w-[680px] px-4 sm:px-6 py-10 space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Lab Yoyaku へようこそ</h1>
        <p className="text-neutral-600 mt-2">
          研究室の機器をグループ単位で管理し、QRコードから利用状況やカレンダーを確認・予約できます。
        </p>
      </header>

      <section className="grid sm:grid-cols-3 gap-4">
        <Card title="① グループを作成" desc="研究室/班をグループとして立ち上げ、メンバーを招待します。" />
        <Card title="② グループに参加" desc="招待リンク or コードから参加。機器一覧とカレンダーが使えます。" />
        <Card title="③ 機器登録 & カレンダー" desc="機器ごとのQRを発行し、予約・使用中がひと目で分かります。" />
      </section>

      <section className="max-w-md">
        <h2 className="text-xl font-semibold mb-3">ログイン</h2>
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="ユーザー名"
            value={username}
            onChange={(e) => setU(e.target.value)}
            required
          />
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="パスワード"
            type="password"
            value={password}
            onChange={(e) => setP(e.target.value)}
            required
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            disabled={loading}
            className="px-4 py-2 rounded bg-black text-white disabled:opacity-60"
          >
            {loading ? "ログイン中…" : "ログイン"}
          </button>
        </form>
        <p className="text-xs text-neutral-500 mt-2">
          デモ環境では <code>demo / demo</code> など固定ユーザーに合わせてください（
          <code>src/app/api/auth/login/route.ts</code> の条件）。
        </p>
      </section>
    </main>
  );
}

function Card({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl border p-5">
      <p className="font-semibold">{title}</p>
      <p className="text-sm text-neutral-600 mt-1">{desc}</p>
    </div>
  );
}

