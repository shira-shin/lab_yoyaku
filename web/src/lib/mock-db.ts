import bcrypt from 'bcryptjs';
import type { Group, Member, Device, Reservation } from './types';

type DB = {
  groups: Group[];
  members: Member[];
  devices: Device[];
  reservations: Reservation[];
};

const KEY = 'lab_yoyaku_v1';
const isBrowser = typeof window !== 'undefined';

const db: DB = {
  groups: [],
  members: [],
  devices: [],
  reservations: [],
};

function save() {
  if (!isBrowser) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    // ignore
  }
}

function load() {
  if (!isBrowser) return;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) Object.assign(db, JSON.parse(raw));
  } catch {
    // ignore
  }
}

if (isBrowser) load();

function genId() {
  return crypto.randomUUID();
}

export async function verifyPassword(group: Group, password: string) {
  if (!group.passwordHash) return false;
  return bcrypt.compare(password, group.passwordHash);
}

export async function insertGroup(p: {
  name: string;
  slug: string;
  password?: string;
}) {
  const passwordHash = p.password
    ? await bcrypt.hash(p.password, await bcrypt.genSalt(10))
    : undefined;
  const group: Group = {
    id: genId(),
    name: p.name,
    slug: p.slug,
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  db.groups.push(group);
  save();
  return group;
}

export function updateGroup(id: string, patch: Partial<Group>) {
  const g = db.groups.find(g => g.id === id);
  if (!g) return undefined;
  Object.assign(g, patch);
  save();
  return g;
}

export function deleteGroup(id: string) {
  const i = db.groups.findIndex(g => g.id === id);
  if (i >= 0) {
    db.groups.splice(i, 1);
    save();
  }
}

export const findGroupBySlug = (slug: string) =>
  db.groups.find(g => g.slug === slug);

export function insertMember(m: Omit<Member, 'id'>) {
  const member: Member = { ...m, id: genId() };
  db.members.push(member);
  save();
  return member;
}

export function updateMember(id: string, patch: Partial<Member>) {
  const m = db.members.find(m => m.id === id);
  if (!m) return undefined;
  Object.assign(m, patch);
  save();
  return m;
}

export function deleteMember(id: string) {
  const i = db.members.findIndex(m => m.id === id);
  if (i >= 0) {
    db.members.splice(i, 1);
    save();
  }
}

export const findMembers = (groupId: string) =>
  db.members.filter(m => m.groupId === groupId);

export function insertDevice(d: Omit<Device, 'id' | 'status'> & { status?: Device['status'] }) {
  const device: Device = { ...d, id: genId(), status: d.status ?? 'available' };
  db.devices.push(device);
  save();
  return device;
}

export function updateDevice(id: string, patch: Partial<Device>) {
  const d = db.devices.find(d => d.id === id);
  if (!d) return undefined;
  Object.assign(d, patch);
  save();
  return d;
}

export function deleteDevice(id: string) {
  const i = db.devices.findIndex(d => d.id === id);
  if (i >= 0) {
    db.devices.splice(i, 1);
    save();
  }
}

export const findDevices = (groupId: string) =>
  db.devices.filter(d => d.groupId === groupId);

export function insertReservation(r: Omit<Reservation, 'id'>) {
  const res: Reservation = { ...r, id: genId() };
  db.reservations.push(res);
  save();
  return res;
}

export function updateReservation(id: string, patch: Partial<Reservation>) {
  const r = db.reservations.find(r => r.id === id);
  if (!r) return undefined;
  Object.assign(r, patch);
  save();
  return r;
}

export function deleteReservation(id: string) {
  const i = db.reservations.findIndex(r => r.id === id);
  if (i >= 0) {
    db.reservations.splice(i, 1);
    save();
  }
}

export const findReservations = (q: {
  groupId: string;
  deviceId?: string;
  from?: string;
  to?: string;
}) => {
  return db.reservations.filter(r => {
    if (r.groupId !== q.groupId) return false;
    if (q.deviceId && r.deviceId !== q.deviceId) return false;
    if (q.from && r.end <= q.from) return false;
    if (q.to && r.start >= q.to) return false;
    return true;
  });
};

export { db as mockDB };

