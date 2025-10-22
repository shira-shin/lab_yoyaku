import process from "node:process";

const required = [
  "GOOGLE_OAUTH_CLIENT_ID",
  "GOOGLE_OAUTH_CLIENT_SECRET",
  "AUTH_SECRET",
  "AUTH_URL",
];

const missing = required.filter((key) => !process.env[key]);

if (missing.length) {
  console.error("[assert-env] Missing:", missing.join(", "));
  process.exit(1);
}

console.log("[assert-env] All required auth env vars are present.");
