import { NextRequest, NextResponse } from "next/server";
import { negotiations, save } from "@/lib/mock-db";

export async function PATCH(req: NextRequest, { params:{id} }:{ params:{ id:string } }) {
  const p = await req.json();
  const rec = negotiations.find(n=>n.id===id);
  if(!rec) return NextResponse.json({ error:'not found' }, { status:404 });
  if(p.status) rec.status = p.status;
  save();
  return NextResponse.json({ negotiation: rec });
}
