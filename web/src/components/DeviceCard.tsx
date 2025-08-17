"use client";
import Link from "next/link";
import BadgeStatus from "./BadgeStatus";
import type { Device } from "@/lib/mock";

export default function DeviceCard({ d }: { d: Device }) {
  const nextAction =
    d.status === "in_use" ? "終了予定 17:00" : "次予約 15:00";
  return (
    <Link
      href={`/devices/${d.device_uid}`}
      className="group block rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{d.name}</h3>
        <BadgeStatus state={d.status} />
      </div>
      <div className="mt-2 text-sm text-neutral-600">
        {d.category} ・ {d.location}
      </div>
      <div className="mt-1 text-xs text-neutral-500">
        UID: {d.device_uid} ・ SOP v{d.sop_version}
      </div>
      <div className="mt-4 flex items-center justify-between text-sm text-neutral-600">
        <span>{nextAction}</span>
        <span className="text-neutral-400 transition group-hover:translate-x-1 group-hover:text-neutral-600" aria-hidden>
          →
        </span>
      </div>
    </Link>
  );
}
