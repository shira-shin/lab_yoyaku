'use client';
import { useState } from 'react';
import Button from '@/components/ui/Button';

export default function DeviceNew({ params:{slug} }:{ params:{ slug:string } }) {
  const [name,setName] = useState('');
  const [category,setCategory] = useState('');
  const [place,setPlace] = useState('');
  const [sop,setSop] = useState('1');

  const submit = async (e:React.FormEvent)=>{
    e.preventDefault();
    const r = await fetch('/api/mock/devices',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ name, category, location:place, sop_version:sop, groupSlug: slug })
    });
    if(r.ok){
      const { device } = await r.json();
      window.location.href = `/devices/${device.device_uid}/poster`;
    } else {
      alert('エラー');
    }
  };

  return (
    <main className="max-w-md space-y-4">
      <h1 className="text-2xl font-bold">機器登録</h1>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">名称</label>
          <input value={name} onChange={e=>setName(e.target.value)} className="w-full rounded border p-2" required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">カテゴリ</label>
          <input value={category} onChange={e=>setCategory(e.target.value)} className="w-full rounded border p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">場所</label>
          <input value={place} onChange={e=>setPlace(e.target.value)} className="w-full rounded border p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">SOPバージョン</label>
          <input value={sop} onChange={e=>setSop(e.target.value)} className="w-full rounded border p-2" />
        </div>
        <Button type="submit" variant="primary">登録</Button>
      </form>
    </main>
  );
}
