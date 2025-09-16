"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GroupJoinPage() {
  const [group, setGroup] = useState(""); // name or slug
  const [password, setPassword] = useState("");
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const res = await fetch('/api/groups/join', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: group, password }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErr(j?.error || '参加に失敗しました');
        return;
      }
      const { data } = await res.json();
      if (!data?.slug) {
        setErr('参加できましたが slug を取得できませんでした');
        return;
      }
      router.push(`/groups/${data.slug}`);
    } catch (e: any) {
      setErr(e.message || '参加に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">グループに参加</h1>
        <a href="/" className="btn btn-secondary">ホームに戻る</a>
      </div>
      <form onSubmit={onSubmit} className="space-y-5">
        <label className="block">
          <div className="mb-1">グループ名 または slug</div>
          <input
            className="w-full rounded-xl border p-3"
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            required
            aria-required="true"
          />
        </label>
        <label className="block">
          <div className="mb-1">パスワード</div>
          <input
            type="password"
            className="w-full rounded-xl border p-3"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            aria-required="true"
          />
        </label>
        {err && (
          <p className="text-red-600 text-sm" role="alert" aria-live="polite">
            {err}
          </p>
        )}
        <button
          className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading || !group || !password}
          aria-disabled={loading || !group || !password}
        >
          {loading ? "参加中..." : "参加する"}
        </button>
      </form>
    </div>
  );
}

