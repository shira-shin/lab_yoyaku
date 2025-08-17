"use client";
import Link from "next/link";
import BadgeStatus from "./BadgeStatus";
import type { Device } from "@/lib/mock";

export default function DeviceCard({ d }: { d: Device }) {
  return (
    <Link
      href={`/devices/${d.device_uid}`}
      className="block rounded-2xl border p-4 hover:shadow-md transition"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{d.name}</h3>
        <BadgeStatus state={d.status} />
      </div>
      <div className="mt-2 text-sm text-neutral-600">
        {d.category} ・ {d.location}
      </div>
      <div className="text-xs text-neutral-500">
        UID: {d.device_uid} ・ SOP v{d.sop_version}
      </div>
    </Link>
  );
}
