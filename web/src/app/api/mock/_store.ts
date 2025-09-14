import { loadDB, saveDB, uid } from '@/lib/mockdb';

export const store = {
  findGroupBySlug(slug: string) {
    const db = loadDB();
    return db.groups.find((g: any) => g.slug === slug) || null;
  },
  findDeviceBySlug(slug: string) {
    const db = loadDB();
    for (const g of db.groups || []) {
      const d = (g.devices || []).find((x: any) => x.slug === slug);
      if (d) return { ...d, groupSlug: g.slug };
    }
    return null;
  },
  findDevice(groupSlug: string, deviceSlug: string) {
    const db = loadDB();
    const g = db.groups.find((x: any) => x.slug === groupSlug);
    if (!g) return null;
    const d = (g.devices || []).find((x: any) => x.slug === deviceSlug);
    return d ? { ...d, groupSlug: g.slug } : null;
  },
  listDevices(groupSlug: string) {
    const db = loadDB();
    const g = db.groups.find((x: any) => x.slug === groupSlug);
    return g?.devices || [];
  },
  findReservationsByDevice(deviceId: string) {
    const db = loadDB();
    const res: any[] = [];
    for (const g of db.groups || []) {
      res.push(...((g.reservations || []).filter((r: any) => r.deviceId === deviceId)));
    }
    return res;
  },
  addDevice(groupSlug: string, payload: { name: string; slug: string; caution?: string; code?: string }) {
    const db = loadDB();
    const g = db.groups.find((x: any) => x.slug === groupSlug);
    if (!g) return null;
    g.devices = g.devices || [];
    if (g.devices.some((d: any) => d.slug === payload.slug)) return null;
    const device: any = {
      id: uid(),
      name: payload.name,
      slug: payload.slug,
      caution: payload.caution,
      code: payload.code,
      qrToken: uid(),
    };
    g.devices.push(device);
    saveDB(db);
    return device;
  },
  createReservation(payload: { groupSlug: string; deviceId: string; start: string; end: string; purpose?: string; user: string; userName?: string }) {
    const db = loadDB();
    const g = db.groups.find((x: any) => x.slug === payload.groupSlug);
    if (!g) return null;
    const reservation: any = {
      id: uid(),
      deviceId: payload.deviceId,
      start: payload.start,
      end: payload.end,
      purpose: payload.purpose,
      user: payload.user,
      userName: payload.userName,
    };
    g.reservations = g.reservations || [];
    g.reservations.push(reservation);
    saveDB(db);
    return reservation;
  },
  listReservationsByGroup(slug: string) {
    const db = loadDB();
    const g = db.groups.find((x: any) => x.slug === slug);
    return g?.reservations || [];
  },
  currentUserId() {
    const db = loadDB();
    return db.users?.[0]?.id || 'user1';
  },
};

export function toArr<T>(v: T[] | Record<string, T> | null | undefined): T[] {
  if (Array.isArray(v)) return v;
  if (v && typeof v === 'object') return Object.values(v as Record<string, T>);
  return [];
}
