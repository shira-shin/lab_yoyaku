import process from "node:process";
// NodeのURLコンストラクタを明示的に取得（tsxのVM環境での未定義対策）
import { URL as NodeURL } from "node:url";

// === 必須環境変数（E/P認証前提） ===
const required = [
  "DATABASE_URL",
  "JWT_SECRET",
] as const;

const missing = required.filter((k) => !process.env[k] || String(process.env[k]).trim() === "");
if (missing.length > 0) {
  throw new Error(`[assert-env] Missing required env(s): ${missing.join(", ")}`);
}

// === DATABASE_URL の妥当性と pooler 禁止ガード ===
const dbUrl = String(process.env.DATABASE_URL);

try {
  const u = new NodeURL(dbUrl); // ← グローバルURLではなく node:url の URL を使用
  if (u.hostname.includes("-pooler")) {
    throw new Error(
      `[assert-env] DATABASE_URL points to a pooler host (${u.hostname}). Use the Direct host (no "-pooler").`
    );
  }
  // SSL要件のヒント（強制はしないが推奨）
  if (u.searchParams.get("sslmode") !== "require") {
    console.warn(`[assert-env] Hint: add "sslmode=require" to DATABASE_URL for Neon.`);
  }
} catch (error) {
  // ここに来る場合、URL構文が不正 or 文字列そのものが未定義/壊れている
  throw new Error(`[assert-env] Invalid DATABASE_URL: ${String(error)}`);
}

console.log("[assert-env] OK: required envs present and DATABASE_URL points to a Direct host.");
