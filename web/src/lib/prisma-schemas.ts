import { z, type infer as Infer } from '@/lib/zod'

const date = z.coerce.date()

export const GroupSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().nullable(),
  passcode: z.string().nullable(),
  hostEmail: z.string().min(1),
  reserveFrom: date.nullable(),
  reserveTo: date.nullable(),
  memo: z.string().nullable(),
  createdAt: date,
})

export const DeviceSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  caution: z.string().nullable(),
  code: z.string().nullable(),
  qrToken: z.string().min(1),
  createdAt: date,
  groupId: z.string().min(1),
})

export const ReservationSchema = z.object({
  id: z.string().min(1),
  deviceId: z.string().min(1),
  userEmail: z.string().min(1),
  userName: z.string().nullable(),
  start: date,
  end: date,
  purpose: z.string().nullable(),
  createdAt: date,
})

export const UserProfileSchema = z.object({
  email: z.string().min(1),
  displayName: z.string().nullable(),
  createdAt: date,
  updatedAt: date,
})

export type Group = Infer<typeof GroupSchema>
export type Device = Infer<typeof DeviceSchema>
export type Reservation = Infer<typeof ReservationSchema>
export type UserProfile = Infer<typeof UserProfileSchema>
