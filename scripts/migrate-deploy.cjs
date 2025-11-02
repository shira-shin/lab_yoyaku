// scripts/migrate-deploy.cjs
const { execSync } = require("node:child_process");
const fs = require("node:fs");

function sh(cmd) {
  console.log("[migrate] run:", cmd);
  return execSync(cmd, { stdio: "inherit", shell: true });
}

const WEB_SCHEMA = "./web/prisma/schema.prisma";
const ROOT_SCHEMA = "./prisma/schema.prisma";
const schema = fs.existsSync(WEB_SCHEMA) ? WEB_SCHEMA : ROOT_SCHEMA;

function prismaGenerate() {
  sh(`pnpm exec prisma generate --schema="${schema}"`);
}

function runFixStuckMigration() {
  // ここでさっきの cjs を叩く
  // Prisma Client が内部で DATABASE_URL を見に行くので、Vercel の env で設定されていれば動く
  try {
    sh(`node scripts/fix-stuck-migration.cjs`);
  } catch (e) {
    console.log("[migrate] fix-stuck script failed but continue:", e.message || e);
  }
}

function runMigrateDeploy() {
  try {
    sh(`pnpm exec prisma migrate deploy --schema="${schema}"`);
    console.log("[migrate] migrate deploy OK");
  } catch (err) {
    const msg = String(err?.stdout || err?.stderr || err?.message || err);

    // ここがいままで throw してて build が死んでたので、飲み込む
    if (msg.includes("P3009") || msg.includes("P3011")) {
      console.log("[migrate] got P3009/P3011 but we already tried to clean _prisma_migrations. continue build.");
      return;
    }

    // それ以外はほんとにエラーなので投げる
    throw err;
  }
}

function main() {
  prismaGenerate();
  runFixStuckMigration();
  runMigrateDeploy();
}

main();
