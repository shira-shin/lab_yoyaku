"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GroupJoinPage() {
  const [group, setGroup] = useState(""); // name or slug
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier: group, password }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok && data.data) {
        try {
          router.push(`/groups/${data.data.slug}`);
        } catch {
          setErr('ページ遷移に失敗しました');
        }
      } else {
        throw new Error(data?.error || 'failed');
      }
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-2xl p-6 space-y-6">
      <h1 className="text-3xl font-bold">グループに参加</h1>
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
          className="rounded-xl bg-black text-white px-5 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading || !group || !password}
          aria-disabled={loading || !group || !password}
        >
          {loading ? "参加中..." : "参加する"}
        </button>
      </form>
    </main>
  );
}

