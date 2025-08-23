import { addGroup, findGroupBySlug, listGroups as dbListGroups, addDevice, listDevicesByGroup, addReservation, listReservations as dbListReservations } from './mock-db';
import type { Group, Device, Reservation } from './types';

// Groups
export async function listGroups(): Promise<Group[]> {
  return dbListGroups();
}

export async function getGroup(slug: string): Promise<{ group: Group | undefined }> {
  const group = findGroupBySlug(slug);
  return { group };
}

export async function createGroup(input: { name: string; slug: string; password?: string }) {
  return addGroup({ name: input.name, slug: input.slug, passwordHash: input.password });
}

export async function joinGroup(input: { identifier: string; password: string }) {
  const g = dbListGroups().find(
    grp => grp.slug === input.identifier || grp.name === input.identifier
  );
  if (!g) throw new Error('group not found');
  if (g.passwordHash && g.passwordHash !== input.password) {
    throw new Error('invalid password');
  }
  return { group: g };
}

// Devices
export async function listDevices(groupId: string): Promise<Device[]> {
  return listDevicesByGroup(groupId);
}

export async function createDevice(input: { groupId: string; name: string; note?: string }) {
  return addDevice(input);
}

// Reservations
export async function listReservations(groupId: string, deviceId?: string): Promise<Reservation[]> {
  return dbListReservations(groupId, deviceId);
}

export async function createReservation(input: {
  groupId: string; deviceId: string; start: string; end: string; purpose?: string; reserver: string;
}) {
  return addReservation(input);
}
