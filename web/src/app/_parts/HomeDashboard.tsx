import Link from "next/link"
import { listMyReservations } from "@/lib/api"

export default async function HomeDashboard() {
  const res = await listMyReservations().catch(() => ({ ok: false, data: [] as any[] }))
  const reservations = res.ok ? (res.data as any[]) : []

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 space-y-8">
      <h1 className="text-2xl font-bold">ホーム</h1>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">あなたの予約（直近）</h2>
        {reservations.length === 0 ? (
          <p className="text-neutral-600">直近の予約はありません。</p>
        ) : (
          <ul className="divide-y rounded-2xl border">
            {reservations.map((r, i) => (
              <li key={i} className="p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">{r.deviceName}</p>
                  <p className="text-sm text-neutral-600">
                    {fmt(r.from)} – {fmt(r.to)}（用途: {r.purpose || '—'}）
                  </p>
                </div>
                <Link href={`/devices/${r.deviceSlug}`} className="text-blue-600 hover:underline text-sm">
                  機器へ
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-x-3">
        <Link className="px-3 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-500" href="/groups/new">グループを作成</Link>
        <Link className="px-3 py-2 rounded border" href="/groups/join">グループに参加</Link>
        <Link className="px-3 py-2 rounded border" href="/dashboard">ダッシュボード</Link>
        <Link className="px-3 py-2 rounded border" href="/groups">グループ一覧</Link>
      </section>
    </main>
  )
}

function fmt(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}
