import bcrypt from "bcryptjs";
import type { Group, Device, Reservation, Negotiation } from "./types";

// in-memory mock database
export const mockDB = {
  groups: [
    { id: "g1", name: "植物生理学研究室", slug: "plant-phys" },
    { id: "g2", name: "分析化学研究室", slug: "analytical" },
  ] as Group[],
  devices: [
    {
      id: "d1",
      device_uid: "JR-PAM-01",
      name: "ジュニアPAM",
      category: "fluorometer",
      location: "Room 302",
      status: "available",
      sop_version: 3,
      groupId: "g1",
    },
    {
      id: "d2",
      device_uid: "PCR-02",
      name: "PCR (Thermal Cycler)",
      category: "pcr",
      location: "Room 305",
      status: "reserved",
      sop_version: 5,
      groupId: "g1",
    },
    {
      id: "d3",
      device_uid: "GC-01",
      name: "GC-MS",
      category: "gcms",
      location: "Room 210",
      status: "maintenance",
      sop_version: 7,
      groupId: "g2",
    },
  ] as Device[],
  reservations: [
    {
      id: "r1",
      deviceId: "d2",
      groupId: "g1",
      start: new Date().toISOString(),
      end: new Date(Date.now() + 60 * 60e3).toISOString(),
      note: "PCR 予備実験",
      status: "in_use",
      bookedByType: "user",
      bookedById: "u-suzuki",
    },
    {
      id: "r2",
      deviceId: "d1",
      groupId: "g1",
      start: new Date(Date.now() + 2 * 60 * 60e3).toISOString(),
      end: new Date(Date.now() + 3 * 60 * 60e3).toISOString(),
      note: "光合成測定",
      status: "confirmed",
      bookedByType: "group",
      bookedById: "g1",
    },
  ] as Reservation[],
  negotiations: [] as Negotiation[],
};

// legacy named exports for convenience
export const groups = mockDB.groups;
export const devices = mockDB.devices;
export const reservations = mockDB.reservations;
export const negotiations = mockDB.negotiations;

// remove passwordHash when sending to client
export const publicizeGroup = (g: Group) => {
  const { passwordHash, ...rest } = g;
  return rest;
};

export async function hashPassword(plain: string) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

export async function verifyPassword(hash: string, plain: string) {
  return bcrypt.compare(plain, hash);
}

export function getGroupByNameOrSlug(identifier: string) {
  const key = identifier.trim().toLowerCase();
  return mockDB.groups.find(
    (g) => g.name.toLowerCase() === key || g.slug.toLowerCase() === key,
  );
}

export async function createGroup(input: {
  name: string;
  slug: string;
  password: string;
}) {
  if (getGroupByNameOrSlug(input.name) || getGroupByNameOrSlug(input.slug)) {
    throw new Error("同名/同slugのグループが既に存在します");
  }
  const passwordHash = await hashPassword(input.password);
  const group: Group = {
    id: crypto.randomUUID(),
    name: input.name,
    slug: input.slug,
    passwordHash,
  };
  mockDB.groups.push(group);
  return group;
}

export async function joinGroup(identifier: string, password: string) {
  const g = getGroupByNameOrSlug(identifier);
  if (!g) throw new Error("グループが見つかりません");
  if (!g.passwordHash)
    throw new Error("このグループはまだパスワード設定がありません");
  const ok = await verifyPassword(g.passwordHash, password);
  if (!ok) throw new Error("パスワードが違います");
  return g;
}

