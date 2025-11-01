import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // ログがうるさかったら後で減らす
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
