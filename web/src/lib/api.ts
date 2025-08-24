import { createApi } from './api-factory';

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
} = createApi(getBaseURL);
