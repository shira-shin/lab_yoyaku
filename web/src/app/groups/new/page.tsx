"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

function toSlug(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

export default function GroupNewPage() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!slug) setSlug(toSlug(name));
  }, [name]); // eslint-disable-line react-hooks/exhaustive-deps

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const safeSlug = toSlug(slug || name);
    if (!safeSlug) {
      setErr("slug を半角英数字で入力してください（名称から自動生成されます）");
      setLoading(false);
      return;
    }
    const res = await fetch("/api/mock/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug: safeSlug, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErr(data.error || "作成に失敗しました");
      setLoading(false);
      return;
    }
    router.push(`/groups/${data.group.slug}/calendar`);
  }

  return (
    <main className="max-w-2xl p-6 space-y-6">
      <h1 className="text-3xl font-bold">グループ作成</h1>
      <form onSubmit={onSubmit} className="space-y-5">
        <label className="block">
          <div className="mb-1">名称</div>
          <input
            className="w-full rounded-xl border p-3"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            aria-required="true"
          />
        </label>
        <label className="block">
          <div className="mb-1">slug</div>
          <input
            className="w-full rounded-xl border p-3"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
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
          disabled={loading || !name || !slug || !password}
          aria-disabled={loading || !name || !slug || !password}
        >
          {loading ? "作成中..." : "作成"}
        </button>
      </form>
    </main>
  );
}

