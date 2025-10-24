import process from "node:process";

const required = [
  "DATABASE_URL",
  // 使っていれば有効化
  // "APP_AUTH_SECRET",
  // "APP_BASE_URL",
] as const;

const missing = required.filter((key) => !process.env[key]);

if (missing.length) {
  console.error(`[assert-env] Missing: ${missing.join(", ")}`);
  process.exit(1);
}

const url = process.env.DATABASE_URL || "";

try {
  const parsed = new URL(url);

  if (parsed.hostname.includes("-pooler")) {
    throw new Error(
      `DATABASE_URL points to a pooler host (${parsed.hostname}). Use the Direct host (no "-pooler").`,
    );
  }
} catch (error) {
  throw new Error(`Invalid DATABASE_URL or missing: ${String(error)}`);
}

console.log("[assert-env] OK: required envs present for email/password auth.");
