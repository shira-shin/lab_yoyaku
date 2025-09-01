'use client';

export default function UsagePage() {
  return (
    <div className="max-w-3xl p-4 space-y-4">
      <h1 className="text-2xl font-bold">アプリの使い方</h1>
      <ol className="list-decimal ml-6 space-y-2">
        <li>グループを作成するか、既存のグループに参加します。</li>
        <li>機器登録ページから機器を登録し、生成された機器コードを共有します。</li>
        <li>カレンダーから機器の予約を追加・確認します。</li>
      </ol>
      <p className="text-sm text-neutral-500">
        複数のグループで同じ機器を利用する場合は、機器コードを入力して登録してください。
      </p>
    </div>
  );
}
