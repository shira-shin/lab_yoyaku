export type DeviceOrder =
  | { updatedAt: 'desc' }
  | { createdAt: 'desc' };

export const deviceOrderSafe = (hasUpdatedAt: boolean): DeviceOrder =>
  hasUpdatedAt ? { updatedAt: 'desc' } : { createdAt: 'desc' };
