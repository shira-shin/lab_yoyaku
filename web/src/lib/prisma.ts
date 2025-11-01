import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Always prefer DIRECT_URL (Vercel preview URLs are not stable)
const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  console.warn("[prisma] no DATABASE_URL/DIRECT_URL defined at runtime");
} else {
  process.env.DATABASE_URL = url;
}

const client =
  global.prisma ??
  new PrismaClient({
    log: ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = client;
}

export { client as prisma };
