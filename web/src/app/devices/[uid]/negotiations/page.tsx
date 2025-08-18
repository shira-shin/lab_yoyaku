import { notFound } from 'next/navigation';
import { getDevice, getNegotiations } from '@/lib/api';
import NegotiationList from '@/components/NegotiationList';

export default async function NegotiationsPage({ params:{uid} }:{ params:{ uid:string } }){
  const d = await getDevice(decodeURIComponent(uid));
  if(!d) return notFound();
  const { negotiations } = await getNegotiations(d.id);
  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-bold">交渉: {d.name}</h1>
      <NegotiationList deviceId={d.id} initialNegotiations={negotiations} />
    </main>
  );
}
