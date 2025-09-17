'use client';
import { useRouter } from 'next/navigation';
import { startTransition, useState } from 'react';

export default function NewGroupForm() {
  const r = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get('name') || '').trim();
    const payload = {
      name,
      password: String(fd.get('password') || ''),
      startAt: fd.get('startAt') || null,
      endAt: fd.get('endAt') || null,
      memo: String(fd.get('memo') || ''),
    };

    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'same-origin',
      });

      if (res.status === 401) {
        location.assign('/login?next=/groups/new');
        return;
      }

      if (res.status === 409) {
        setError('同じ URL のグループが既に存在します');
        return;
      }

      const json = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);

      const slug = json?.group?.slug ?? json?.slug ?? (name || '').toLowerCase();

      const joinRes = await fetch('/api/groups/join', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug, query: slug, password: payload.password }),
        credentials: 'same-origin',
      });

      if (joinRes.status === 401) {
        location.assign(`/login?next=/groups/${encodeURIComponent(slug)}`);
        return;
      }

      if (!joinRes.ok) {
        const joinJson = await joinRes.json().catch(() => ({} as any));
        throw new Error(joinJson?.error ?? `HTTP ${joinRes.status}`);
      }

      r.replace(`/groups/${encodeURIComponent(slug)}`);
      startTransition(() => r.refresh());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'グループの作成に失敗しました';
      setError(message || 'グループの作成に失敗しました');
    } finally {
      setSubmitting(false);
    }
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
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? '作成中…' : 'グループを作る'}
      </button>
    </form>
  );
}
