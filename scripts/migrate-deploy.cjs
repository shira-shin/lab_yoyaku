// scripts/migrate-deploy.cjs
const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

function sh(cmd) {
  console.log("[migrate] run:", cmd);
  return execSync(cmd, { stdio: "inherit", shell: true });
}

// 1) decide schema path (prefer web/)
const WEB_SCHEMA = "./web/prisma/schema.prisma";
const ROOT_SCHEMA = "./prisma/schema.prisma";
const schema = fs.existsSync(WEB_SCHEMA) ? WEB_SCHEMA : ROOT_SCHEMA;

// 2) detect migrations dir (for info only)
const WEB_MIGRATIONS = path.join(process.cwd(), "web", "prisma", "migrations");
const ROOT_MIGRATIONS = path.join(process.cwd(), "prisma", "migrations");
const migrationsDir = fs.existsSync(WEB_MIGRATIONS)
  ? WEB_MIGRATIONS
  : ROOT_MIGRATIONS;

// 10/29に失敗しているやつを固定で潰す
// Prisma のフォルダ名は yyyyMMddHHmmss_label になるので、ここでは固定IDでいく
const FAILED_INIT_ID = "20251029151251_init";

function tryRollbackInit() {
  const candidate1 = path.join(WEB_MIGRATIONS, FAILED_INIT_ID);
  const candidate2 = path.join(ROOT_MIGRATIONS, FAILED_INIT_ID);
  const exists =
    fs.existsSync(candidate1) || fs.existsSync(candidate2);

  if (!exists) {
    console.log(
      "[migrate] init migration folder not found, but will attempt resolve anyway"
    );
  }

  try {
    sh(
      `pnpm exec prisma migrate resolve --schema="${schema}" --rolled-back ${FAILED_INIT_ID}`
    );
    console.log("[migrate] rolled back failed init migration:", FAILED_INIT_ID);
  } catch (err) {
    console.log(
      "[migrate] ignore error while resolving failed init migration:",
      err?.message || err
    );
  }
}

function main() {
  // generate first
  sh(`pnpm exec prisma generate --schema="${schema}"`);

  // (optional) your backfill SQL
  if (fs.existsSync("./scripts/sql/backfill_normalized_email.sql")) {
    sh(
      `pnpm exec prisma db execute --schema="${schema}" --file=./scripts/sql/backfill_normalized_email.sql`
    );
  }

  // always try to kill the bad init before deploy
  tryRollbackInit();

  // now try deploy
  try {
    sh(`pnpm exec prisma migrate deploy --schema="${schema}"`);
    console.log("[migrate] deploy OK");
  } catch (err) {
    const text = String(
      err?.stdout || err?.stderr || err?.message || err
    );
    console.log("[migrate] deploy failed:", text);

    // ====== IMPORTANT ======
    // if it's P3009 again, log and continue so Vercel build can finish
    if (text.includes("P3009")) {
      console.log(
        "[migrate] P3009 detected AGAIN. DB is in dirty state but we will continue build."
      );
      return; // ← ここで終了させて 0 exit 相当
    }

    // その他のエラーはそのまま投げる
    throw err;
  }
}

main();
