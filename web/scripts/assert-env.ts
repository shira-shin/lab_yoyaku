import process from "node:process";
import { URL } from "node:url";

const isVercel = process.env.VERCEL === "1";
const isBuildPhase = process.env.npm_lifecycle_event === "build";

function mustString(name: string) {
  const value = process.env[name];
  if (!value || String(value).trim() === "") {
    throw new Error(`[assert-env] Missing ${name}`);
  }
  return String(value);
}

function mustUrl(name: string) {
  const raw = mustString(name);
  try {
    return new URL(raw);
  } catch (err) {
    throw new Error(`[assert-env] Invalid ${name}: ${String(err)}`);
  }
}

const dbUrl = mustUrl("DATABASE_URL");
const directUrl = mustUrl("DIRECT_URL");

const hasSslRequire = (url: URL) => url.searchParams.get("sslmode") === "require";

if (!hasSslRequire(dbUrl)) {
  console.warn("[assert-env] Hint: add \"sslmode=require\" to DATABASE_URL for Neon.");
}
if (!hasSslRequire(directUrl)) {
  console.warn("[assert-env] Hint: add \"sslmode=require\" to DIRECT_URL for Neon.");
}

const isPoolerHost = (host: string) => host.includes("-pooler.");

// 要件：
// - DATABASE_URL が pooler でもビルドを通す
// - その場合は DIRECT_URL が Direct（非-pooler）であることを必須にする
if (isPoolerHost(dbUrl.host)) {
  console.log(
    `[assert-env] DATABASE_URL is pooler host (${dbUrl.host}); Prisma operations will use DIRECT_URL (${directUrl.host}).`,
  );
  if (isPoolerHost(directUrl.host)) {
    throw new Error("[assert-env] DIRECT_URL must point to a Direct (non-pooler) host.");
  }
} else {
  console.log("[assert-env] DATABASE_URL is Direct host; DIRECT_URL also configured.");
  if (isPoolerHost(directUrl.host)) {
    throw new Error("[assert-env] DIRECT_URL must point to a Direct (non-pooler) host.");
  }
}

// JWT_SECRET は本番実行時に必要、ビルド時は警告に留める
if (!process.env.JWT_SECRET) {
  if (isVercel && isBuildPhase) {
    console.warn("[assert-env] Warning: JWT_SECRET is missing during build. Ensure it is set at runtime!");
  } else {
    throw new Error("[assert-env] Missing JWT_SECRET");
  }
}

console.log("[assert-env] OK: envs present and validated.");
