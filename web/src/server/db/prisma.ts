import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prismaServerGlobal: PrismaClient | undefined;
}

if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

if (process.env.LOG_DB_URL_HOST === "1" && process.env.DATABASE_URL) {
  const masked = process.env.DATABASE_URL.replace(/:\/\/.*@/, "://***@");
  const host = masked.includes("@")
    ? masked.split("@")[1]?.split("?")[0] ?? masked
    : masked;
  console.log("[DB_URL_HOST]", host);
}

export const prisma =
  globalThis.prismaServerGlobal ??
  new PrismaClient({
    log: ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaServerGlobal = prisma;
}
