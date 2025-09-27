export default function Page({ params }: { params: { slug: string } }) {
  return (
    <main className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">当番の自動割当</h1>
      <p className="text-sm text-gray-500">グループ: {params.slug}</p>
      {/* 後でウィザード実装 */}
      <div className="rounded-lg border p-4 bg-white">
        ここに「期間」「方式（ラウンドロビン/ランダム/手動）」「対象メンバー/曜日」などを置く予定。
      </div>
    </main>
  );
}
