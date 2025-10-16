import process from "node:process";

const isVercel = process.env.VERCEL === "1";
const errs: string[] = [];
const warns: string[] = [];

function required(name: string) {
  if (!process.env[name]) errs.push(`${name} is required`);
}

function warnIfMissing(name: string, msg?: string) {
  if (!process.env[name]) warns.push(msg ?? `${name} is suggested`);
}

// 必須（これだけは fail）
required("AUTH_SECRET");
required("AUTH_GOOGLE_ID");
required("AUTH_GOOGLE_SECRET");

// 推奨（警告）
warnIfMissing(
  "AUTH_URL",
  "AUTH_URL is recommended. On Vercel it will fallback to https://${VERCEL_URL}",
);
if (isVercel && process.env.AUTH_TRUST_HOST !== "true") {
  warns.push(
    "On Vercel set AUTH_TRUST_HOST=true (we'll force trustHost at runtime as a fallback).",
  );
}

if (errs.length) {
  console.error("[assert-env] Missing required env:", errs);
  process.exit(1);
}

if (warns.length) {
  console.warn("[assert-env] Warnings:", warns);
} else {
  console.log("[assert-env] All required auth env vars are present.");
}
