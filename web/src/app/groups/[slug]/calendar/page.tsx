import { getGroup, getReservations } from "@/lib/api";
import { devices } from "@/lib/mock-db"; // 本番はAPI化
import BadgeUsage from "@/components/BadgeUsage";

export default async function GroupCalendar({
  params: { slug },
}: {
  params: { slug: string };
}) {
  const { group } = await getGroup(slug);
  const devs = devices.filter((d) => d.groupId === group.id);
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(from.getDate() + 7);
  const { reservations } = await getReservations({
    groupId: group.id,
    from: from.toISOString(),
    to: to.toISOString(),
  });

  const dayStart = new Date();
  dayStart.setHours(8, 0, 0, 0);
  const slots = 28;
  const hours = Array.from({ length: slots }, (_, i) =>
    new Date(dayStart.getTime() + i * 30 * 60 * 1000)
  );

  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-bold">{group.name} のカレンダー（週）</h1>
      <div className="text-sm text-neutral-600">
        凡例：<BadgeUsage type="group" /> <BadgeUsage type="user" name="A.Suzuki" />
      </div>

      <div className="overflow-x-auto border rounded-2xl">
        <div
          className="min-w-[960px] grid relative"
          style={{
            gridTemplateColumns: `140px repeat(${devs.length}, minmax(200px, 1fr))`,
            gridTemplateRows: `40px repeat(${slots}, 40px)`,
          }}
        >
          {/* ヘッダ行 */}
          <div className="bg-neutral-50 border-b p-2 font-medium">時間</div>
          {devs.map((d) => (
            <div key={d.id} className="bg-neutral-50 border-b p-2 font-medium">
              {d.name}
            </div>
          ))}

          {/* 時刻ラベル列 */}
          {hours.map((t, i) => (
            <div
              key={`time-${i}`}
              className="border-r p-2 text-sm text-neutral-500"
              style={{ gridColumn: 1, gridRow: i + 2 }}
            >
              {t.toTimeString().slice(0, 5)}
            </div>
          ))}

          {/* 各デバイスの空グリッド */}
          {devs.map((d, col) =>
            hours.map((_, i) => (
              <div
                key={`cell-${col}-${i}`}
                className="border-b"
                style={{ gridColumn: col + 2, gridRow: i + 2 }}
              />
            ))
          )}

          {/* 予約イベント */}
          {reservations.map((r: any) => {
            const col = devs.findIndex((d) => d.id === r.deviceId);
            if (col < 0) return null;
            const startIdx = Math.max(
              0,
              Math.floor(
                (new Date(r.start).getTime() - dayStart.getTime()) /
                  (30 * 60 * 1000)
              )
            );
            const endIdx = Math.max(
              startIdx + 1,
              Math.ceil(
                (new Date(r.end).getTime() - dayStart.getTime()) /
                  (30 * 60 * 1000)
              )
            );
            const isGroup = r.bookedByType === "group";
            return (
              <div
                key={r.id}
                className={`rounded-md px-2 py-1 text-sm bg-amber-100 ${
                  isGroup
                    ? "border-2 border-emerald-400"
                    : "border border-sky-300"
                }`}
                style={{
                  gridColumn: col + 2,
                  gridRow: `${startIdx + 2} / ${endIdx + 2}`,
                }}
                title={`${new Date(r.start).toLocaleString()} - ${new Date(
                  r.end
                ).toLocaleTimeString()}`}
              >
                <div className="truncate text-neutral-800">{r.note ?? "予約"}</div>
                <div className="text-xs text-neutral-500">
                  {isGroup ? "グループ予約" : `個人予約`}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
