// Client-side API helpers built on top of the shared core
import { createApi } from './api-core';

function getBaseURL() {
  return process.env.NEXT_PUBLIC_API_BASE || '';
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
} = createApi(getBaseURL);
