import type { Group, Device, Reservation } from './types';
import { uid } from './uid';

export type DB = {
  groups: Group[];
  devices: Device[];
  reservations: Reservation[];
};

declare global {
  // eslint-disable-next-line no-var
  var __MOCK_DB__: DB | undefined;
}

const db: DB = (globalThis.__MOCK_DB__ ??= {
  groups: [],
  devices: [],
  reservations: [],
});

// Groups
export function listGroups() {
  return db.groups;
}

export function addGroup(input: { name: string; slug: string; passwordHash?: string }) {
  const group: Group = { id: uid(), memberIds: [], ...input };
  db.groups.push(group);
  return group;
}

export function findGroupBySlug(slug: string) {
  return db.groups.find(g => g.slug === slug);
}

// Devices
export function listDevicesByGroup(groupId: string) {
  return db.devices.filter(d => d.groupId === groupId);
}

export function addDevice(input: { groupId: string; name: string; note?: string }) {
  const d: Device = { id: uid(), ...input };
  db.devices.push(d);
  return d;
}

// Reservations
export function listReservations(groupId: string, deviceId?: string) {
  return db.reservations.filter(r => r.groupId === groupId && (!deviceId || r.deviceId === deviceId));
}

export function addReservation(input: {
  groupId: string; deviceId: string; start: string; end: string; purpose?: string; reserver: string;
}) {
  const deviceOK = db.devices.some(d => d.id === input.deviceId && d.groupId === input.groupId);
  if (!deviceOK) throw new Error('device not in group');
  const r: Reservation = { id: uid(), ...input };
  db.reservations.push(r);
  return r;
}

export { db };
