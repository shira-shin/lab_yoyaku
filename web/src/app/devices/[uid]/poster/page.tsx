import { notFound } from 'next/navigation';
import { getDevice } from '@/lib/api';
import DevicePoster from '@/components/DevicePoster';

export default async function PosterPage({ params:{uid} }:{ params:{ uid:string } }){
  const d = await getDevice(decodeURIComponent(uid));
  if(!d) return notFound();
  return <DevicePoster device={d} />;
}
