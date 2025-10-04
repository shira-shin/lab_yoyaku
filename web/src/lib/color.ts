export function deviceColor(deviceId: string) {
  let h = 0;
  for (const c of deviceId) {
    h = (h * 31 + c.charCodeAt(0)) % 360;
  }
  return `hsl(${h} 72% 46%)`;
}

export function deviceColorSoft(deviceId: string) {
  let h = 0;
  for (const c of deviceId) {
    h = (h * 31 + c.charCodeAt(0)) % 360;
  }
  return `hsl(${h} 72% 96%)`;
}
