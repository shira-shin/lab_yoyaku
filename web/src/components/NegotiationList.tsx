'use client';
import { useState } from 'react';
import Button from '@/components/ui/Button';
import { createNegotiation, updateNegotiation } from '@/lib/api';

export default function NegotiationList({ deviceId, initialNegotiations }:{ deviceId:string; initialNegotiations:any[] }){
  const [list,setList] = useState(initialNegotiations);
  const [name,setName] = useState('');
  const [msg,setMsg] = useState('');

  const submit = async (e:React.FormEvent)=>{
    e.preventDefault();
    const { negotiation } = await createNegotiation({ deviceId, requesterName:name, message:msg });
    setList([negotiation, ...list]);
    setName(''); setMsg('');
  };

  const change = async (id:string, status:string)=>{
    const { negotiation } = await updateNegotiation(id, status);
    setList(list.map(n=>n.id===id?negotiation:n));
  };

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="space-y-2">
        <input
          value={name}
          onChange={e=>setName(e.target.value)}
          placeholder="名前"
          aria-label="名前"
          className="w-full rounded border p-2"
          required
          aria-required="true"
        />
        <textarea
          value={msg}
          onChange={e=>setMsg(e.target.value)}
          placeholder="メッセージ"
          aria-label="メッセージ"
          className="w-full rounded border p-2"
          required
          aria-required="true"
        />
        <Button type="submit" variant="primary">送信</Button>
      </form>
      <ul className="space-y-2">
        {list.map(n=>(
          <li key={n.id} className="rounded border p-2">
            <div className="font-medium">{n.requesterName} <span className="text-xs text-neutral-500">{new Date(n.createdAt).toLocaleString()}</span></div>
            <div className="text-sm text-neutral-700 whitespace-pre-line">{n.message}</div>
            <div className="text-xs mt-2">状態: {n.status}</div>
            {n.status==='open' && (
              <div className="space-x-2 mt-2">
                <Button type="button" onClick={()=>change(n.id,'accepted')}>承諾</Button>
                <Button type="button" onClick={()=>change(n.id,'rejected')}>拒否</Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
