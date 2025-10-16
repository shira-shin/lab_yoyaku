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

// 必須（不足している場合は警告だけ出す）
required("AUTH_SECRET");
required("AUTH_GOOGLE_ID");
required("AUTH_GOOGLE_SECRET");

// 推奨（警告）
warnIfMissing(
  "AUTH_URL",
  "AUTH_URL is recommended. On Vercel it will fallback to https://${VERCEL_URL}",
);
if (isVercel && process.env.AUTH_TRUST_HOST !== "true") {
  console.warn(
    "[assert-env] AUTH_TRUST_HOST should be 'true' on Vercel. Continuing build.",
  );
}

if (errs.length) {
  console.warn("[assert-env] Missing required env:", errs);
}

if (warns.length) {
  console.warn("[assert-env] Warnings:", warns);
}

if (!errs.length && !warns.length) {
  console.log("[assert-env] All required auth env vars are present.");
}
