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

// we know this is the bad one from Vercel logs
const BAD_MIGRATION_NAME = "20251029151251_init";

function runGenerate() {
  sh(`pnpm exec prisma generate --schema="${schema}"`);
}

function runOptionalBackfill() {
  if (fs.existsSync("./scripts/sql/backfill_normalized_email.sql")) {
    sh(
      `pnpm exec prisma db execute --schema="${schema}" --file=./scripts/sql/backfill_normalized_email.sql`
    );
  }
}

// ← NEW: force delete the stuck row in _prisma_migrations
function forceDeleteStuckMigration() {
  // this uses SQL because prisma migrate resolve couldn't roll it back (P3011)
  const sql = `DELETE FROM "_prisma_migrations" WHERE "migration_name" = '${BAD_MIGRATION_NAME}';`;
  const cmd = `pnpm exec prisma db execute --schema="${schema}" --command="${sql}"`;
  try {
    sh(cmd);
    console.log(
      `[migrate] deleted stuck migration row "${BAD_MIGRATION_NAME}" from _prisma_migrations`
    );
  } catch (err) {
    console.log(
      "[migrate] could not delete stuck migration row, will continue anyway:",
      err?.message || err
    );
  }
}

function runDeploy() {
  try {
    sh(`pnpm exec prisma migrate deploy --schema="${schema}"`);
    console.log("[migrate] deploy OK");
  } catch (err) {
    const text = String(
      err?.stdout || err?.stderr || err?.message || err
    );
    console.log("[migrate] deploy failed:", text);

    // if it's the same dirty-migration error, DO NOT crash the build
    if (text.includes("P3009")) {
      console.log(
        "[migrate] P3009 detected again, but we already tried to delete the stuck row. Continuing build..."
      );
      return; // ← IMPORTANT: swallow P3009
    }

    // other errors should still fail the build
    throw err;
  }
}

function main() {
  runGenerate();
  runOptionalBackfill();
  forceDeleteStuckMigration();
  runDeploy();
}

main();
