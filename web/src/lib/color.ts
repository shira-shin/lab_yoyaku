export function deviceColor(deviceId: string) {
  let h = 0;
  for (let i = 0; i < deviceId.length; i++) {
    h = (h * 31 + deviceId.charCodeAt(i)) % 360;
  }
  return `hsl(${h} 70% 45%)`;
}
