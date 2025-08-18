"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import BadgeStatus from "./BadgeStatus";
import BadgeUsage from "./BadgeUsage";
import { getReservations } from "@/lib/api";
import type { Device, Reservation } from "@/lib/types";

export default function DeviceCard({ d }: { d: Device }) {
  const [nextRes, setNextRes] = useState<Reservation | null>(null);
  useEffect(() => {
    const load = async () => {
      const { reservations } = await getReservations({ deviceId: d.id, from: new Date().toISOString() });
      if (reservations.length > 0) {
        reservations.sort((a: any, b: any) => new Date(a.start).getTime() - new Date(b.start).getTime());
        setNextRes(reservations[0]);
      }
    };
    load();
  }, [d.id]);
  const nextAction = nextRes
    ? `次予約 ${new Date(nextRes.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : d.status === "in_use"
    ? "使用中"
    : "空き";
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
        <div className="flex items-center gap-2">
          {nextRes && (
            <BadgeUsage
              type={nextRes.bookedByType}
              name={nextRes.bookedByType === "user" ? nextRes.bookedById : undefined}
            />
          )}
          <span className="text-neutral-400 transition group-hover:translate-x-1 group-hover:text-neutral-600" aria-hidden>
            →
          </span>
        </div>
      </div>
    </Link>
  );
}
