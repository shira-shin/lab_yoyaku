import { getGroup, getReservations } from "@/lib/api";
import { devices } from "@/lib/mock-db"; // 本番はAPI化
import BadgeUsage from "@/components/BadgeUsage";

function hoursRange(start=8,end=22){return Array.from({length:(end-start+1)},(_,i)=>start+i);}

export default async function GroupCalendar({ params:{slug} }:{params:{slug:string}}){
  const { group } = await getGroup(slug);
  const devs = devices.filter(d=>d.groupId===group.id);
  const from = new Date(); from.setHours(0,0,0,0);
  const to = new Date(from); to.setDate(from.getDate()+7);
  const { reservations } = await getReservations({ groupId: group.id, from: from.toISOString(), to: to.toISOString() });

  // CSS Grid: 列=デバイス、行=時間スロット
  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-bold">{group.name} のカレンダー（週）</h1>
      <div className="text-sm text-neutral-600">凡例：<BadgeUsage type="group" /> <BadgeUsage type="user" name="A.Suzuki" /></div>
      <div className="overflow-x-auto border rounded-2xl">
        <div className="min-w-[960px] grid" style={{gridTemplateColumns:`160px repeat(${devs.length}, 1fr)`}}>
          {/* ヘッダー行 */}
          <div className="bg-neutral-50 border-b p-2 font-medium">時間</div>
          {devs.map(d=><div key={d.id} className="bg-neutral-50 border-b p-2 font-medium">{d.name}</div>)}

          {/* 本体：30分刻み */}
          {Array.from({length: (14*2)},(_,i)=>i).map(i=>{
            const t = new Date(from.getTime()+i*30*60*1000);
            const label = t.toTimeString().slice(0,5);
            return (
              <>
                <div key={`t-${i}`} className="border-r p-2 text-sm text-neutral-500">{label}</div>
                {devs.map((d,idx)=>{
                  const slotKey=`c-${i}-${idx}`;
                  return <div key={slotKey} className="border-b h-12 relative" />;
                })}
              </>
            );
          })}

          {/* 予約を重ね描き（重なり簡易） */}
          {reservations.map((r:any)=>{
            const col = devs.findIndex(d=>d.id===r.deviceId);
            if(col<0) return null;
            const startIdx = Math.max(0, Math.floor((new Date(r.start).getTime()-from.getTime())/(30*60*1000)));
            const endIdx   = Math.min(28, Math.ceil((new Date(r.end).getTime()-from.getTime())/(30*60*1000)));
            const top = startIdx*48; const height = Math.max(24,(endIdx-startIdx)*48-4);
            return (
              <div
                key={r.id}
                className={`absolute bg-amber-100 border-amber-300 border rounded-md px-2 py-1 text-sm`}
                style={{ left: 160 + col*( (960-160)/devs.length ), top, width: (960-160)/devs.length - 8, height }}
                title={`${r.start} - ${r.end}`}
              >
                <span className="block truncate text-neutral-800">{r.note ?? "予約"}</span>
                <span className="text-xs text-neutral-500">{r.bookedByType==='group'?'グループ予約':'個人予約'}</span>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
