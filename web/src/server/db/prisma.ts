import { prisma } from "@/lib/prisma";

if (process.env.LOG_DB_URL_HOST === "1") {
  const url = process.env.DATABASE_URL;
  const masked = url ? url.replace(/:\/\/.*@/, "://***@") : "NO_DB_URL";
  const host = masked.includes("@")
    ? masked.split("@")[1]?.split("?")[0] ?? masked
    : masked;
  console.log("[DB_URL_HOST]", host);
}

export { prisma };
