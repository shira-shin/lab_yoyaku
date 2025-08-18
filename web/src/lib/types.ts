export type Group = { id: string; name: string; slug: string };
export type Member = { userId: string; groupId: string; role: 'admin'|'member' };
export type Device = {
  id: string; device_uid: string; name: string; category?: string; location?: string;
  status: 'available'|'reserved'|'in_use'|'maintenance'|'out_of_service';
  sop_version: number; groupId: string;
};
export type ReservationStatus = 'confirmed'|'in_use'|'completed'|'cancelled';
export type BookedByType = 'group'|'user';
export type Reservation = {
  id: string; deviceId: string; groupId: string;
  start: string; end: string; note?: string;
  status: ReservationStatus;
  bookedByType: BookedByType; bookedById: string; // groupId or userId
  createdByUserId?: string;
};

export type NegotiationStatus = 'open'|'accepted'|'rejected';
export type Negotiation = {
  id: string;
  targetReservationId?: string;
  deviceId: string;
  requesterName: string;
  message: string;
  status: NegotiationStatus;
  createdAt: string;
};
