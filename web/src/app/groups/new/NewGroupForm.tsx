'use client';
import { useRouter } from 'next/navigation';

export default function NewGroupForm() {
  const r = useRouter();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get('name') || '').trim();
    const payload = {
      name,
      password: String(fd.get('password') || ''),
      startAt: fd.get('startAt') || null,
      endAt: fd.get('endAt') || null,
      memo: String(fd.get('memo') || ''),
    };

    const res = await fetch('/api/mock/groups', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    if (res.status === 409) {
      const slug = (name || '').toLowerCase();
      r.push(`/groups/${encodeURIComponent(slug)}`);
      return;
    }

    const json = await res.json().catch(() => ({} as any));
    if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);

    const slug = json?.group?.slug ?? json?.slug ?? (name || '').toLowerCase();
    r.push(`/groups/${encodeURIComponent(slug)}`);
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
      <button type="submit" className="btn btn-primary">
        グループを作る
      </button>
    </form>
  );
}
