import { notFound } from "next/navigation";
import BadgeStatus from "@/components/BadgeStatus";
import ReservationModal from "@/components/ReservationModal";
import { getDevice, getReservations } from "@/lib/api";

export default async function DeviceDetail({ params }: { params: { uid: string } }) {
  const uid = decodeURIComponent(params.uid);
  const d = await getDevice(uid);
  if (!d) return notFound();
  const { reservations } = await getReservations({ deviceId: d.id, from: new Date(Date.now()-7*24*60*60e3).toISOString() });
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
          <section className="mt-6">
            <h2 className="text-lg font-semibold mb-2">最近の予約</h2>
            {reservations.length===0 ? <p className="text-sm text-neutral-500">直近の予約はありません。</p> :
              <ul className="space-y-1 text-sm">
                {reservations.slice(0,5).map((r:any)=>(
                  <li key={r.id} className="text-neutral-700">
                    {new Date(r.start).toLocaleString()} — {new Date(r.end).toLocaleTimeString()} ・{r.bookedByType==='group'?'グループ':`個人:${r.bookedById}`}
                  </li>
                ))}
              </ul>}
          </section>
        </section>
        <aside className="h-fit space-y-3 rounded-2xl border p-4">
          <ReservationModal deviceId={d.id} groupId={d.groupId}/>
          <button className="w-full rounded-2xl border px-4 py-2">使用開始</button>
          <button className="w-full rounded-2xl border px-4 py-2">QRポスター</button>
        </aside>
      </div>
    </main>
  );
}
