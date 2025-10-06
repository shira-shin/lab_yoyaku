function hueFromDevice(deviceId: string) {
  let h = 0;
  for (const c of deviceId) {
    h = (h * 31 + c.charCodeAt(0)) % 360;
  }
  return h;
}

export function deviceColor(deviceId: string) {
  const h = hueFromDevice(deviceId);
  return `hsl(${h} 72% 46%)`;
}

export function deviceBg(deviceId: string) {
  const h = hueFromDevice(deviceId);
  return `hsl(${h} 72% 96%)`;
}

export function deviceBgPast(deviceId: string) {
  const h = hueFromDevice(deviceId);
  return `hsl(${h} 22% 98%)`;
}
