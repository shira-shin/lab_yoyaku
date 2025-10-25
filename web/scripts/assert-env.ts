import process from "node:process";
import { URL as NodeURL } from "node:url";

const isVercel = process.env.VERCEL === "1";
const isBuildPhase = process.env.npm_lifecycle_event === "build";

// 常に必須
const requiredAlways = ["DATABASE_URL", "DIRECT_URL"] as const;
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

const parseEnvUrl = (key: string) => {
  const raw = String(process.env[key]);
  try {
    return new NodeURL(raw);
  } catch (err) {
    throw new Error(`[assert-env] Invalid ${key}: ${String(err)}`);
  }
};

const dbUrl = parseEnvUrl("DATABASE_URL");
const directUrl = parseEnvUrl("DIRECT_URL");

const hasSslRequire = (url: NodeURL) => url.searchParams.get("sslmode") === "require";

if (!hasSslRequire(dbUrl)) {
  console.warn(`[assert-env] Hint: add "sslmode=require" to DATABASE_URL for Neon.`);
}
if (!hasSslRequire(directUrl)) {
  console.warn(`[assert-env] Hint: add "sslmode=require" to DIRECT_URL for Neon.`);
}

const isPooler = (url: NodeURL) => url.hostname.includes("-pooler");

if (isPooler(directUrl)) {
  throw new Error(
    `[assert-env] DIRECT_URL must point to the Direct host (no "-pooler"). Received: ${directUrl.hostname}`,
  );
}

if (isPooler(dbUrl)) {
  console.log(
    `[assert-env] DATABASE_URL is pooler host (${dbUrl.hostname}); Prisma operations will use DIRECT_URL (${directUrl.hostname}).`,
  );
} else {
  console.log("[assert-env] DATABASE_URL is Direct host; DIRECT_URL also configured.");
}

console.log("[assert-env] OK: envs present and validated.");
