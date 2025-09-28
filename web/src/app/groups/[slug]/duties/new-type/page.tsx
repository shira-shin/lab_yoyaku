import Link from 'next/link';

import { CreateDutyTypeForm } from './CreateDutyTypeForm';

export default function Page({ params }: { params: { slug: string } }) {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">当番タイプの追加</h1>
        <p className="text-sm text-muted-foreground">グループ: {params.slug}</p>
      </header>

      <section className="rounded-lg border bg-white p-6 shadow-sm">
        <CreateDutyTypeForm slug={params.slug} />
      </section>

      <Link
        href={`/groups/${params.slug}/duties`}
        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        ← 当番一覧へ戻る
      </Link>
    </main>
  );
}
