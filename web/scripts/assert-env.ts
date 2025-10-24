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

console.log("[assert-env] OK: required envs present for email/password auth.");
