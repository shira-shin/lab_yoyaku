import process from "node:process";

const required = [
  "AUTH_GOOGLE_ID",
  "AUTH_GOOGLE_SECRET",
  "AUTH_SECRET",
  "APP_BASE_URL",
];

const missing = required.filter((key) => !process.env[key]);

if (missing.length) {
  console.error("[assert-env] Missing:", missing.join(", "));
  process.exit(1);
}

console.log("[assert-env] All required auth env vars are present.");
