import process from "node:process";
import { URL as NodeURL } from "node:url";

const isVercel = process.env.VERCEL === "1";
const isBuildPhase = process.env.npm_lifecycle_event === "build";

// 常に必須
const requiredAlways = ["DATABASE_URL"] as const;
// ランタイム必須（ビルド中は緩和可）
const requiredRuntime = ["JWT_SECRET"] as const;

const required = isVercel && isBuildPhase
  ? [...requiredAlways]
  : [...requiredAlways, ...requiredRuntime];

const missing = required.filter((k) => !process.env[k] || String(process.env[k]).trim() === "");
if (missing.length > 0) {
  throw new Error(`[assert-env] Missing required env(s): ${missing.join(", ")}`);
}
if (!process.env.JWT_SECRET && isVercel && isBuildPhase) {
  console.warn("[assert-env] Warning: JWT_SECRET is missing during build. Ensure it is set at runtime!");
}

const dbUrl = String(process.env.DATABASE_URL);
try {
  const u = new NodeURL(dbUrl);
  if (u.hostname.includes("-pooler")) {
    throw new Error(`[assert-env] DATABASE_URL points to a pooler host (${u.hostname}). Use the Direct host (no "-pooler").`);
  }
  if (u.searchParams.get("sslmode") !== "require") {
    console.warn(`[assert-env] Hint: add "sslmode=require" to DATABASE_URL for Neon.`);
  }
} catch (err) {
  throw new Error(`[assert-env] Invalid DATABASE_URL: ${String(err)}`);
}

console.log("[assert-env] OK: envs present; DATABASE_URL is Direct host.");
