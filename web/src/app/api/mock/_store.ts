import { loadDB, saveDB, uid } from '@/lib/mockdb';

export const store = {
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
};

export function toArr<T>(v: T[] | Record<string, T> | null | undefined): T[] {
  if (Array.isArray(v)) return v;
  if (v && typeof v === 'object') return Object.values(v as Record<string, T>);
  return [];
}
