import { prisma } from '@/server/db/prisma';

type GlobalWithDbLog = typeof globalThis & {
  __loggedDbEndpoint?: boolean;
};

type DbEndpointRow = { endpoint: string | null }

if (process.env.NODE_ENV === 'production') {
  const globalForLog = globalThis as GlobalWithDbLog;
  if (!globalForLog.__loggedDbEndpoint) {
    globalForLog.__loggedDbEndpoint = true;
    prisma
      .$queryRawUnsafe(`SELECT current_setting('neon.endpoint_id', true) AS endpoint`)
      .then((result) => {
        const rows = result as DbEndpointRow[] | undefined
        console.info('[db] endpoint', rows?.[0]?.endpoint ?? null);
      })
      .catch(() => {
        // noop
      });
  }
}

export { prisma };
