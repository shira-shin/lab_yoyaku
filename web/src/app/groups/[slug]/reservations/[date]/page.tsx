export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import { absUrl } from "@/lib/url";

type ReservationRecord = {
  id: string;
  deviceName?: string | null;
  device?: { name?: string | null } | null;
  deviceId?: string | null;
  deviceSlug?: string | null;
  start?: string;
  end?: string;
  startAt?: string;
  endAt?: string;
  startsAt?: string;
  endsAt?: string;
  note?: string | null;
  purpose?: string | null;
};

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default async function GroupReservationDayPage({
  params,
}: {
  params: { slug: string; date: string };
}) {
  const { slug, date } = params;
  const detectedTz = (() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return undefined;
    }
  })();
  const tz = detectedTz || "Asia/Tokyo";
  const query = new URLSearchParams({
    group: slug,
    from: date,
    tz,
  });
  const url = absUrl(`/api/reservations?${query.toString()}`);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("予約情報を取得できませんでした。");
  }
  const payload = await res.json().catch(() => ({}));
  const source = Array.isArray(payload?.data)
    ? (payload.data as ReservationRecord[])
    : Array.isArray(payload?.reservations)
      ? (payload.reservations as ReservationRecord[])
      : [];

  const reservations = source
    .map((item) => {
      const start = item.startAt ?? item.startsAt ?? item.start ?? "";
      const end = item.endAt ?? item.endsAt ?? item.end ?? "";
      const deviceName =
        item.deviceName ??
        item.device?.name ??
        item.deviceId ??
        item.deviceSlug ??
        "";
      return {
        id: item.id,
        deviceName,
        start,
        end,
        note: item.note ?? item.purpose ?? null,
      };
    })
    .filter((item) => item.id && item.deviceName && item.start && item.end);

  return (
    <div className="p-4">
      <h1 className="text-lg font-semibold">{date} の予約</h1>
      {reservations.length ? (
        <ul className="mt-3 space-y-2">
          {reservations.map((reservation) => (
            <li key={reservation.id} className="rounded border p-2 text-sm">
              <div className="font-medium">{reservation.deviceName}</div>
              <div className="text-gray-600">
                {formatDateTime(reservation.start)} – {formatDateTime(reservation.end)}
              </div>
              {reservation.note ? (
                <div className="text-gray-500">{reservation.note}</div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-3 text-gray-500">この日に該当する予約はありません。</div>
      )}
    </div>
  );
}
