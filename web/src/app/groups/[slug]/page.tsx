import Link from "next/link";
import { getGroup } from "@/lib/api";

export default async function GroupDetail({ params:{slug} }:{params:{slug:string}}){
  const { group, devices } = await getGroup(slug);
  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-bold">{group.name}</h1>
      <Link href={`/groups/${group.slug}/calendar`} className="text-sm text-blue-600 hover:underline">カレンダーを見る</Link>
      <div>
        <h2 className="text-lg font-semibold mt-4">機器</h2>
        <ul className="list-disc pl-5 space-y-1">
          {devices.map((d:any)=>(
            <li key={d.id}><Link href={`/devices/${d.device_uid}`} className="text-blue-600 hover:underline">{d.name}</Link></li>
          ))}
        </ul>
      </div>
    </main>
  );
}
