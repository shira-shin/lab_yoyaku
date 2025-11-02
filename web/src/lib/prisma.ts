import { PrismaClient, Prisma } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

// Vercel env gives us both DATABASE_URL (pooler) and DIRECT_URL (direct).
// Production runtime must use DIRECT_URL for Prisma to avoid the pooler.
const directUrl = process.env.DIRECT_URL ?? undefined;
const runtimeUrl = directUrl ?? process.env.DATABASE_URL;

if (process.env.NODE_ENV === "production" && directUrl) {
  process.env.DATABASE_URL = directUrl;
}

const prismaConfig: Prisma.PrismaClientOptions = {
  log: ["warn", "error"],
};

if (runtimeUrl) {
  prismaConfig.datasources = { db: { url: runtimeUrl } };
}

const prisma = globalThis.prismaGlobal ?? new PrismaClient(prismaConfig);

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}

export { prisma };
