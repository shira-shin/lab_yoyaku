// Server-side API helpers using runtime headers to determine base URL
import { headers } from 'next/headers';
import { createApi } from './api-core';

function getBaseURL() {
  if (process.env.NEXT_PUBLIC_API_BASE) return process.env.NEXT_PUBLIC_API_BASE;

  const h = headers();
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const host = h.get('x-forwarded-host') ?? h.get('host');
  return `${proto}://${host}`;
}

function getInit() {
  const cookie = headers().get('cookie') ?? '';
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
} = createApi(getBaseURL, getInit);
