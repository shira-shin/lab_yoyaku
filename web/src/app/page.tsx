import Link from "next/link";
import Button from "@/components/ui/Button";

export default function Home() {
  return (
    <section className="space-y-12">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold">Lab Yoyaku へようこそ</h1>
        <p className="text-neutral-600">
          研究室の機器をグループ単位で管理し、QRコードから利用状況やカレンダーを確認・予約できます。
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <div className="rounded-2xl border p-6">
          <h2 className="font-semibold mb-2">① グループを作成</h2>
          <p className="text-sm text-neutral-600 mb-4">研究室/班をグループとして立ち上げ、メンバーを招待します。</p>
          <Button variant="primary" onClick={() => (location.href = "/groups/new")}>グループを作る</Button>
        </div>
        <div className="rounded-2xl border p-6">
          <h2 className="font-semibold mb-2">② グループに参加</h2>
          <p className="text-sm text-neutral-600 mb-4">招待リンク or コードから参加。機器一覧とカレンダーが使えます。</p>
          <Button onClick={() => (location.href = "/groups/join")}>参加する</Button>
        </div>
        <div className="rounded-2xl border p-6">
          <h2 className="font-semibold mb-2">③ 機器登録 & カレンダー</h2>
          <p className="text-sm text-neutral-600 mb-4">機器ごとのQRを発行し、予約・使用中がひと目で分かります。</p>
          <Link className="text-blue-600 hover:underline" href="/dashboard">ダッシュボードを見る</Link>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-xl font-semibold">ショートカット</h3>
        <div className="flex gap-3">
          <Button onClick={() => (location.href = "/groups")}>グループ一覧</Button>
          <Button onClick={() => (location.href = "/devices")}>機器一覧</Button>
          <Button onClick={() => (location.href = "/dashboard")}>ダッシュボード</Button>
        </div>
      </div>
    </section>
  );
}
