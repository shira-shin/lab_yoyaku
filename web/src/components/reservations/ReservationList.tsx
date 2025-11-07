import { formatUtcInAppTz } from '@/lib/time';

export type ReservationListItem = {
  id: string;
  device: { id: string; name: string };
  user: { name: string | null };
  startsAtUTC: string;
  endsAtUTC: string;
};

function Row({ r }: { r: ReservationListItem }) {
  const userName = r.user.name ?? '（予約者不明）';
  return (
    <li className="leading-6">
      <span className="text-gray-500">機器：</span>
      {r.device.name}
      <span className="text-gray-500"> ／ 予約者：</span>
      {userName}
      <span className="text-gray-500"> ／ 時間：</span>
      {formatUtcInAppTz(r.startsAtUTC)} – {formatUtcInAppTz(r.endsAtUTC)}
    </li>
  );
}

export default function ReservationList({ items }: { items: ReservationListItem[] }) {
  if (!items.length) {
    return <p className="text-sm text-neutral-500">予約がありません。</p>;
  }
  return (
    <ul className="list-disc pl-5 space-y-1 text-sm">
      {items.map((item) => (
        <Row key={item.id} r={item} />
      ))}
    </ul>
  );
}
