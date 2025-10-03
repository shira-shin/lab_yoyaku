"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function GroupJoinPage() {
  const searchParams = useSearchParams();
  const [group, setGroup] = useState(() => searchParams.get("slug") || "");
  const [passcode, setPasscode] = useState("");
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const slugParam = searchParams.get("slug") || "";

  useEffect(() => {
    setGroup(slugParam);
  }, [slugParam]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const slug = group.trim().toLowerCase();
      if (!slug) {
        setErr('グループの識別子を入力してください');
        return;
      }
      const res = await fetch(`/api/groups/${encodeURIComponent(slug)}/join`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ passcode: passcode || undefined }),
        credentials: 'same-origin',
        cache: 'no-store',
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.ok) {
        const code = payload?.code || payload?.error || 'join_failed';
        setErr(String(code));
        return;
      }
      const nextSlug = payload?.data?.slug || slug;
      router.push(`/groups/${nextSlug}`);
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
          <div className="mb-1">グループ slug</div>
          <input
            className="w-full rounded-xl border p-3"
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            required
            aria-required="true"
          />
        </label>
        <label className="block">
          <div className="mb-1">パスコード（必要な場合）</div>
          <input
            type="password"
            className="w-full rounded-xl border p-3"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
          />
        </label>
        {err && (
          <p className="text-red-600 text-sm" role="alert" aria-live="polite">
            {err}
          </p>
        )}
        <button
          className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading || !group.trim()}
          aria-disabled={loading || !group.trim()}
        >
          {loading ? "参加中..." : "参加する"}
        </button>
      </form>
    </div>
  );
}

