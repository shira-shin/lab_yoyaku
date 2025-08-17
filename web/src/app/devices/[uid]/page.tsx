import { notFound } from "next/navigation";
import BadgeStatus from "@/components/BadgeStatus";
import { getDevice, getReservations } from "@/lib/api";

export default async function DeviceDetail({ params }: { params: { uid: string } }) {
  const uid = decodeURIComponent(params.uid);
  const d = await getDevice(uid);
  if (!d) return notFound();
  const { reservations } = await getReservations(uid);
  return (
    <main className="app-container py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{d.name}</h1>
        <BadgeStatus state={d.status} />
      </div>
      <div className="grid gap-6 md:grid-cols-[1fr_260px]">
        <section className="space-y-4">
          <div className="text-neutral-700">
            UID: {d.device_uid}／カテゴリ: {d.category}／位置: {d.location}／SOP v{d.sop_version}
          </div>
          <div>
            <h2 className="mb-2 font-semibold">最近の予約</h2>
            <ul className="space-y-1 text-sm text-neutral-700">
              {reservations.slice(0, 3).map((r: any, i: number) => (
                <li key={i}>
                  {r.start} - {r.end}
                </li>
              ))}
            </ul>
          </div>
        </section>
        <aside className="h-fit space-y-3 rounded-2xl border p-4">
          <button className="w-full rounded-2xl border px-4 py-2">予約</button>
          <button className="w-full rounded-2xl border px-4 py-2">使用開始</button>
          <button className="w-full rounded-2xl border px-4 py-2">QRポスター</button>
        </aside>
      </div>
    </main>
  );
}
