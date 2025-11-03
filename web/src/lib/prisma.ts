import { PrismaClient } from "@prisma/client";
import { getRuntimeDatabaseUrl } from "./db-url";

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

const datasourceUrl = getRuntimeDatabaseUrl();

if (process.env.NODE_ENV === "production") {
  process.env.DATABASE_URL = datasourceUrl;
}

const prisma =
  globalThis.prismaGlobal ??
  new PrismaClient({
    log: ["warn", "error"],
    datasourceUrl,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}

export { prisma };
