'use client';

export default function UsagePage() {
  return (
    <div className="max-w-3xl p-4 space-y-4">
      <h1 className="text-2xl font-bold">アプリの使い方</h1>
      <ol className="list-decimal ml-6 space-y-2">
        <li>
          <span className="font-medium">グループに参加する：</span>
          新しくグループを作成するか、共有されたリンクから既存のグループに参加します。
        </li>
        <li>
          <span className="font-medium">機器を登録する：</span>
          「機器登録」ページで機器名と注意事項を入力して登録します。<br />
          すでに他のグループで使っている機器は、機器コードを入力して共有できます。
        </li>
        <li>
          <span className="font-medium">予約を追加する：</span>
          グループページのフォームから開始・終了時刻を指定して予約します。
        </li>
        <li>
          <span className="font-medium">予約の確認と管理：</span>
          カレンダーから予約状況を確認し、不要になった予約は削除できます。
        </li>
        <li>
          <span className="font-medium">カレンダーの印刷：</span>
          右上の「印刷」ボタンから、現在の月の予定を印刷できます。
        </li>
      </ol>
      <p className="text-sm text-neutral-500">
        複数のグループで同じ機器を利用する場合は、機器コードを入力して登録してください。
      </p>
    </div>
  );
}
