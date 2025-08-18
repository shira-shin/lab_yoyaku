import Link from 'next/link';
import { getGroup } from '@/lib/api';

export default async function GroupDetail({ params: { slug } }: { params: { slug: string } }) {
  const g = await getGroup(slug);
  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-bold">{g.name}</h1>
      <Link
        href={`/groups/${g.slug}/calendar`}
        className="text-sm text-blue-600 hover:underline"
      >
        カレンダーを見る
      </Link>
      <div>
        <h2 className="text-lg font-semibold mt-4">機器</h2>
        <ul className="list-disc pl-5 space-y-1">
          {g.devices.map((d: any) => (
            <li key={d.id}>
              <Link
                href={`/devices/${d.id}`}
                className="text-blue-600 hover:underline"
              >
                {d.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
