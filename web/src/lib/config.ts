export function getBaseUrl() {
  const port = process.env.PORT ?? '3000';
  const env = process.env.NEXT_PUBLIC_BASE_URL;
  if (env) {
    try {
      const url = new URL(env);
      if (url.hostname !== 'localhost' || url.port === port) {
        return env;
      }
    } catch {
      // ignore invalid URL in env
    }
  }
  return `http://localhost:${port}`;
}
