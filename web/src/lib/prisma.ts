import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

// Vercel の preview 環境では DATABASE_URL がプーラー経由になることがあり、
// 書き込みを行うには DIRECT_URL を利用する必要がある。
// Prisma Client を初期化する前にランタイムで上書きしておく。
if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

const client = globalThis.prismaGlobal ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = client;
}

export const prisma = client;
