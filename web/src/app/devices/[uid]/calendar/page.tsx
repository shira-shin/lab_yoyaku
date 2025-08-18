import { notFound } from "next/navigation";
import { getDevice, getReservations } from "@/lib/api";
import BadgeUsage from "@/components/BadgeUsage";

export default async function DeviceCalendar({ params:{uid} }:{params:{uid:string}}){
  const device = await getDevice(decodeURIComponent(uid));
  if(!device) return notFound();
  const from = new Date(); from.setHours(0,0,0,0);
  const to = new Date(from); to.setDate(from.getDate()+7);
  const { reservations } = await getReservations({ deviceId: device.id, from: from.toISOString(), to: to.toISOString() });
  const devs=[device];
  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-bold">{device.name} カレンダー（週）</h1>
      <div className="text-sm text-neutral-600">凡例：<BadgeUsage type="group" /> <BadgeUsage type="user" name="A.Suzuki" /></div>
      <div className="overflow-x-auto border rounded-2xl">
        <div className="min-w-[480px] grid" style={{gridTemplateColumns:`160px repeat(${devs.length}, 1fr)`}}>
          <div className="bg-neutral-50 border-b p-2 font-medium">時間</div>
          <div className="bg-neutral-50 border-b p-2 font-medium">{device.name}</div>
          {Array.from({length:(14*2)},(_,i)=>i).map(i=>{
            const t=new Date(from.getTime()+i*30*60*1000);
            const label=t.toTimeString().slice(0,5);
            return (
              <>
                <div key={`t-${i}`} className="border-r p-2 text-sm text-neutral-500">{label}</div>
                <div key={`c-${i}`} className="border-b h-12 relative" />
              </>
            );
          })}
          {reservations.map((r:any)=>{
            const startIdx=Math.max(0,Math.floor((new Date(r.start).getTime()-from.getTime())/(30*60*1000)));
            const endIdx=Math.min(28,Math.ceil((new Date(r.end).getTime()-from.getTime())/(30*60*1000)));
            const top=startIdx*48; const height=Math.max(24,(endIdx-startIdx)*48-4);
            return (
              <div key={r.id} className="absolute bg-amber-100 border-amber-300 border rounded-md px-2 py-1 text-sm" style={{left:160, top, width: (480-160) -8, height}} title={`${r.start} - ${r.end}`}>
                <span className="block truncate text-neutral-800">{r.note ?? '予約'}</span>
                <span className="text-xs text-neutral-500">{r.bookedByType==='group'?'グループ予約':'個人予約'}</span>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
