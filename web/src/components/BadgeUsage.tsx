"use client";
import clsx from "clsx";
export default function BadgeUsage({ type, name }: {type:'group'|'user'|'in_use', name?:string}) {
  const map:any = {
    group: "border border-emerald-300 text-emerald-700 bg-emerald-50",
    user:  "border border-sky-300 text-sky-700 bg-sky-50",
    in_use:"bg-blue-100 text-blue-700"
  };
  return <span className={clsx("inline-flex items-center rounded-2xl px-3 py-1 text-sm", map[type])}>{type==='group'?'グループ':type==='user'?'個人':'使用中'}{name?`: ${name}`:''}</span>;
}
