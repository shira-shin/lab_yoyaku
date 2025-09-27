import Link from 'next/link';

export default function Page({ params }: { params: { slug: string } }) {
  return (
    <main className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">当番タイプの追加</h1>
      <p className="text-sm text-gray-500">グループ: {params.slug}</p>
      {/* 後でフォーム実装 */}
      <div className="rounded-lg border p-4 bg-white">
        ここに「当番タイプ名」「説明」「色」などのフォームを置く予定。
      </div>
      <Link href={`/groups/${params.slug}/duties`} className="text-blue-600 underline">
        ← 当番一覧へ戻る
      </Link>
    </main>
  );
}
