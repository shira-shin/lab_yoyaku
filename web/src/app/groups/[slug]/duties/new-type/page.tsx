import Link from 'next/link';

export default function NewDutyTypePage({ params }: { params: { slug: string } }) {
  return (
    <main className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">当番タイプを追加</h1>
      <p className="text-sm text-gray-500">グループ: {params.slug}</p>
      {/* TODO: フォーム実装 */}
      <div className="text-sm text-gray-400">ここに当番タイプ作成フォームを実装します。</div>
      <Link className="text-blue-600 underline" href={`/groups/${params.slug}/duties`}>
        戻る
      </Link>
    </main>
  );
}
