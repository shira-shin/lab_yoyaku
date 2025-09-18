// Server-side API helpers for RSC/SSR usage
import { headers } from "next/headers";
import { createApi } from "./api-core";
import { getBaseUrl } from "@/lib/http/base-url";
import { serverFetch } from "./serverFetch";

function getInit() {
  const cookie = headers().get("cookie");
  const headerInit: Record<string, string> = {};
  if (cookie) {
    headerInit.cookie = cookie;
  }
  return {
    headers: headerInit,
    credentials: "include" as RequestCredentials,
  } satisfies RequestInit;
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
  const res = await serverFetch(path, init);
  if (!res.ok) {
    console.warn(`[serverGet] ${path} -> ${res.status}`);
    return null; // 401/500 でも throw せず null 返す
  }
  return res.json() as Promise<T>;
}
