import { prisma } from '@/server/db/prisma';

type GlobalWithDbLog = typeof globalThis & {
  __loggedDbEndpoint?: boolean;
};

if (process.env.NODE_ENV === 'production') {
  const globalForLog = globalThis as GlobalWithDbLog;
  if (!globalForLog.__loggedDbEndpoint) {
    globalForLog.__loggedDbEndpoint = true;
    prisma
      .$queryRawUnsafe<{ endpoint: string | null }[]>(
        `SELECT current_setting('neon.endpoint_id', true) AS endpoint`,
      )
      .then((result) => {
        console.info('[db] endpoint', result?.[0]?.endpoint ?? null);
      })
      .catch(() => {
        // noop
      });
  }
}

export { prisma };
