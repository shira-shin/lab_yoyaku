"use client";
import { useState } from "react";
import Button from "@/components/ui/Button";
import { createReservation } from "@/lib/api";

export default function ReservationModal({ deviceId, groupId }:{deviceId:string, groupId:string}) {
  const [open,setOpen]=useState(false);
  const [start,setStart]=useState(""); const [end,setEnd]=useState("");
  const [by,setBy]=useState<'group'|'user'>('user'); const [note,setNote]=useState("");
  const submit=async()=>{
    const s=new Date(start).getTime(), e=new Date(end).getTime();
    if(!(s<e)) return alert("開始は終了より前にしてください");
    if((e-s) > 2*60*60*1000) return alert("2時間を超える予約はできません（試作）");
    try{
      await createReservation({ deviceId, groupId, start, end, note, bookedByType:by, bookedById: by==='group'?groupId:'u-demo' });
      alert("予約を作成しました");
      setOpen(false);
      location.reload(); // モック簡易反映
    }catch(e:any){ alert(e.error ?? "予約失敗");}
  };
  if(!open) return <Button onClick={()=>setOpen(true)}>予約</Button>;
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-4 w-full max-w-md space-y-3">
        <h3 className="text-lg font-semibold">予約を作成</h3>
        <label className="block text-sm">開始 <input type="datetime-local" className="mt-1 w-full border rounded-md px-2 py-1" value={start} onChange={e=>setStart(e.target.value)} /></label>
        <label className="block text-sm">終了 <input type="datetime-local" className="mt-1 w-full border rounded-md px-2 py-1" value={end} onChange={e=>setEnd(e.target.value)} /></label>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-1"><input type="radio" checked={by==='user'} onChange={()=>setBy('user')}/>個人として</label>
          <label className="flex items-center gap-1"><input type="radio" checked={by==='group'} onChange={()=>setBy('group')}/>グループとして</label>
        </div>
        <label className="block text-sm">用途/メモ <textarea className="mt-1 w-full border rounded-md px-2 py-1" rows={3} value={note} onChange={e=>setNote(e.target.value)} /></label>
        <div className="flex justify-end gap-2">
          <Button onClick={()=>setOpen(false)} variant="outline">キャンセル</Button>
          <Button onClick={submit} variant="primary">作成</Button>
        </div>
      </div>
    </div>
  );
}
