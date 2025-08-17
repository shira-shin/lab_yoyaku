import { headers } from "next/headers";

const baseFromHeaders = () => {
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return `${proto}://${host}`;
};

const abs = (p: string) => new URL(p, baseFromHeaders()).toString();

export const getDevices = async () =>
  (await fetch(abs("/api/devices"), { cache: "no-store" })).json();

export const getDevice = async (uid: string) => {
  const { devices } = await getDevices();
  return devices.find((d: any) => d.device_uid === uid);
};

export const getReservations = async (uid: string) =>
  (await fetch(abs(`/api/mock/reservations?uid=${uid}`), {
    cache: "no-store",
  })).json();

export const createReservation = async (p: any) => {
  const r = await fetch(abs("/api/mock/reservations"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(p),
  });
  if (!r.ok) throw await r.json();
  return r.json();
};
