export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import { absUrl } from "@/lib/url";

type ReservationItem = {
  id: string;
  deviceName?: string | null;
  deviceId?: string | null;
  start?: string | null;
  end?: string | null;
  startsAtUTC?: string | null;
  endsAtUTC?: string | null;
  purpose?: string | null;
};

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default async function Day({
  params,
}: {
  params: { slug: string; date: string };
}) {
  const tz = (() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Tokyo";
    } catch {
      return "Asia/Tokyo";
    }
  })();

  const url = absUrl(
    `/api/reservations/daily?groupSlug=${encodeURIComponent(params.slug)}&day=${encodeURIComponent(params.date)}&tz=${encodeURIComponent(tz)}`,
  );
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("予約情報を取得できませんでした。");
  }

  const payload = await res.json().catch(() => ({ data: [] as ReservationItem[] }));
  const data = Array.isArray(payload?.data) ? (payload.data as ReservationItem[]) : [];

  const reservations = data
    .map((item) => ({
      id: item.id,
      deviceName: item.deviceName || item.deviceId || "",
      start: item.startsAtUTC ?? item.start ?? "",
      end: item.endsAtUTC ?? item.end ?? "",
      note: item.purpose ?? null,
    }))
    .filter((item) => item.id && item.deviceName && item.start && item.end);

  const now = Date.now();

  return (
    <div className="p-4">
      <h1 className="text-lg font-semibold">{params.date} の予約</h1>
      {reservations.length ? (
        <ul className="mt-3 space-y-2">
          {reservations.map((reservation) => {
            const isPast = new Date(reservation.end).getTime() < now;
            return (
              <li
                key={reservation.id}
                className={`rounded border p-2 text-sm ${isPast ? 'bg-gray-50 text-gray-500 opacity-60' : ''}`}
              >
                <div className="font-medium">{reservation.deviceName}</div>
                <div className="text-gray-600">
                  {formatDateTime(reservation.start)} – {formatDateTime(reservation.end)}
                </div>
                {reservation.note ? <div className="text-gray-500">{reservation.note}</div> : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-3 text-gray-500">この日に該当する予約はありません。</div>
      )}
    </div>
  );
}
