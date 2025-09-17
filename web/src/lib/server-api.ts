// Server-side API helpers for RSC/SSR usage
import { headers } from "next/headers";
import { createApi } from "./api-core";
import { getBaseUrl } from "@/lib/base-url";

function getInit() {
  const cookie = headers().get("cookie") ?? "";
  return { headers: { cookie } };
}

export const {
  listGroups,
  createGroup,
  getGroup,
  joinGroup,
  listDevices,
  createDevice,
  listReservations,
  createReservation,
  listMyReservations,
} = createApi(getBaseUrl, getInit);

/** SSR/RSC から自分の API を叩くとき用。Cookie を必ず中継して例外にしない */
export async function serverGet<T>(
  path: string,
  init: RequestInit = {}
): Promise<T | null> {
  const h = headers();
  const res = await fetch(path, {
    ...init,
    headers: { ...(init.headers as any), cookie: h.get("cookie") ?? "" },
    cache: "no-store",
  });
  if (!res.ok) {
    console.warn(`[serverGet] ${path} -> ${res.status}`);
    return null; // 401/500 でも throw せず null 返す
  }
  return res.json() as Promise<T>;
}
