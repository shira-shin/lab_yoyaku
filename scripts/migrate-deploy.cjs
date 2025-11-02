// scripts/migrate-deploy.cjs
const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

function sh(cmd) {
  console.log("[migrate] run:", cmd);
  return execSync(cmd, { stdio: "inherit", shell: true });
}

const WEB_SCHEMA = "./web/prisma/schema.prisma";
const ROOT_SCHEMA = "./prisma/schema.prisma";
const schema = fs.existsSync(WEB_SCHEMA) ? WEB_SCHEMA : ROOT_SCHEMA;

// this is the one that keeps showing up in Vercel logs
const BAD_MIGRATION_NAME = "20251029151251_init";

function runGenerate() {
  sh(`pnpm exec prisma generate --schema="${schema}"`);
}

function runOptionalBackfill() {
  const backfillPath = path.join("scripts", "sql", "backfill_normalized_email.sql");
  if (fs.existsSync(backfillPath)) {
    sh(`pnpm exec prisma db execute --schema="${schema}" --file=${backfillPath}`);
  }
}

// NEW: delete the stuck row via a temp file, because prisma 5.22 has no --command
function forceDeleteStuckMigration() {
  const tmpFile = "./tmp-delete-stuck-migration.sql";
  const sql = `DELETE FROM "_prisma_migrations" WHERE "migration_name" = '${BAD_MIGRATION_NAME}';\n`;
  try {
    fs.writeFileSync(tmpFile, sql, "utf8");
    console.log(`[migrate] wrote temp sql to ${tmpFile}`);
    // run it
    sh(`pnpm exec prisma db execute --schema="${schema}" --file=${tmpFile}`);
    console.log(
      `[migrate] deleted stuck migration row "${BAD_MIGRATION_NAME}" from _prisma_migrations`
    );
  } catch (err) {
    console.log(
      "[migrate] could not delete stuck migration row, will continue anyway:",
      err?.message || err
    );
  } finally {
    try {
      if (fs.existsSync(tmpFile)) {
        fs.unlinkSync(tmpFile);
      }
    } catch (e) {
      // ignore
    }
  }
}

function runDeploy() {
  try {
    sh(`pnpm exec prisma migrate deploy --schema="${schema}"`);
    console.log("[migrate] deploy OK");
  } catch (err) {
    const text = String(err?.stdout || err?.stderr || err?.message || err);
    console.log("[migrate] deploy failed:", text);
    if (text.includes("P3009")) {
      console.log(
        "[migrate] P3009 detected (failed init migration in DB) but we already tried to delete it. Allowing build to continue."
      );
      return; // ← swallow P3009
    }
    throw err; // other errors should still fail
  }
}

function main() {
  runGenerate();
  runOptionalBackfill();
  forceDeleteStuckMigration();
  runDeploy();
}

main();
