'use client';

import { useRouter } from 'next/navigation';
import { createGroup } from '@/lib/api';

export default function NewGroupPage() {
  const router = useRouter();

  async function onSubmit(formData: FormData) {
    const name = String(formData.get('name') ?? '').trim();
    const slug = String(formData.get('slug') ?? '').trim();
    const password = String(formData.get('password') ?? '');

    const res = await createGroup({ name, slug, password });
    // API は { ok, data } で返す想定に合わせる
    if (res?.ok && res.data?.slug) {
      router.push(`/groups/${res.data.slug}`);
      router.refresh();
    } else {
      alert(res?.error || '作成に失敗しました');
    }
  }

  return (
    <main className="max-w-2xl p-6 space-y-6">
      <h1 className="text-3xl font-bold">グループ作成</h1>
      <form action={onSubmit} className="space-y-5">
        <label className="block">
          <div className="mb-1">名称</div>
          <input name="name" className="w-full rounded-xl border p-3" required />
        </label>
        <label className="block">
          <div className="mb-1">slug</div>
          <input name="slug" className="w-full rounded-xl border p-3" required />
        </label>
        <label className="block">
          <div className="mb-1">パスワード</div>
          <input
            type="password"
            name="password"
            className="w-full rounded-xl border p-3"
            required
          />
        </label>
        <button type="submit" className="rounded-xl bg-black text-white px-5 py-2">
          作成
        </button>
      </form>
    </main>
  );
}
