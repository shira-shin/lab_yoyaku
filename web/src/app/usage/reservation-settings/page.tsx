export default function ReservationSettingsPage() {
  return (
    <div className="max-w-3xl p-4 space-y-4">
      <h1 className="text-2xl font-bold">予約設定について</h1>
      <p>
        グループ作成時や後から設定できる予約の制限項目について説明します。
      </p>
      <ul className="list-disc ml-6 space-y-2">
        <li>
          <span className="font-medium">予約開始：</span>
          予約を受け付け始める日時を指定できます。それ以前の予約はできません。
        </li>
        <li>
          <span className="font-medium">予約終了：</span>
          予約を受け付ける最終日時を指定できます。それ以降の予約はできません。
        </li>
        <li>
          <span className="font-medium">メモ：</span>
          グループ全体への注意事項などを記載できます。
        </li>
      </ul>
      <p className="text-sm text-neutral-500">
        これらの項目はグループ作成時に設定でき、後から変更することも可能です。
      </p>
    </div>
  );
}

