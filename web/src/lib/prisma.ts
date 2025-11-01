import { PrismaClient } from "@prisma/client";

const databaseUrl =
  process.env.DIRECT_URL && process.env.DIRECT_URL.trim().length > 0
    ? process.env.DIRECT_URL
    : process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "[prisma] neither DIRECT_URL nor DATABASE_URL is set – cannot init prisma",
  );
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
