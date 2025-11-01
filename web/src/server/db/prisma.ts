import { PrismaClient } from "@prisma/client";

if (process.env.LOG_DB_URL_HOST === "1") {
  const url = process.env.DIRECT_URL && process.env.DIRECT_URL.trim().length > 0
    ? process.env.DIRECT_URL
    : process.env.DATABASE_URL;
  const masked = url ? url.replace(/:\/\/.*@/, "://***@") : "NO_DB_URL";
  const host = masked.includes("@")
    ? masked.split("@")[1]?.split("?")[0] ?? masked
    : masked;
  console.log("[DB_URL_HOST]", host);
}

const databaseUrl =
  process.env.DIRECT_URL && process.env.DIRECT_URL.trim().length > 0
    ? process.env.DIRECT_URL
    : process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "[prisma] neither DIRECT_URL nor DATABASE_URL is set – cannot init prisma",
  );
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    log: ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
