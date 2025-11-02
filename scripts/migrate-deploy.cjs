// scripts/migrate-deploy.cjs
const { execSync } = require("node:child_process");
const fs = require("node:fs");

function sh(cmd) {
  console.log("[migrate] run:", cmd);
  return execSync(cmd, { stdio: "inherit", shell: true });
}

// monorepo なので web/ のほうを優先する
const WEB_SCHEMA = "./web/prisma/schema.prisma";
const ROOT_SCHEMA = "./prisma/schema.prisma";
const SCHEMA = fs.existsSync(WEB_SCHEMA) ? WEB_SCHEMA : ROOT_SCHEMA;

function prismaGenerate() {
  sh(`pnpm exec prisma generate --schema="${SCHEMA}"`);
}

function migrateDeployOnce() {
  sh(`pnpm exec prisma migrate deploy --schema="${SCHEMA}"`);
}

function migrateResetForce() {
  // ここでDBをきれいにする（Neonでも動く）
  sh(
    `pnpm exec prisma migrate reset --force --skip-seed --schema="${SCHEMA}"`
  );
}

function main() {
  prismaGenerate();

  try {
    // まず普通に deploy
    migrateDeployOnce();
    console.log("[migrate] deploy OK (no errors)");
  } catch (err) {
    const out =
      String(err?.stderr || err?.stdout || err?.message || err) || "";
    console.log("[migrate] first deploy failed:", out);

    // Prisma が「過去に失敗したmigrationある」と言ってる場合
    if (out.includes("P3009") || out.includes("P3011")) {
      console.log(
        "[migrate] detected P3009/P3011 -> resetting database then redeploying"
      );

      // 一旦 DB を初期化
      migrateResetForce();

      // もう一度 deploy
      migrateDeployOnce();

      console.log(
        "[migrate] deploy OK after reset (P3009/P3011 self-healed)"
      );
      return;
    }

    // それ以外のエラーは本当に失敗なのでそのまま落とす
    throw err;
  }
}

main();
