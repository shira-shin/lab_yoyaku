#!/usr/bin/env node
const { execSync } = require("node:child_process");

const file = "scripts/sql/hotfix_add_device_updatedAt.sql";
const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  console.log("[hotfix] skip (no DB url)");
  process.exit(0);
}
console.log("[hotfix] run:", file, "on", url.replace(/\/\/.*?@/, "//****@"));
execSync(`pnpm exec prisma db execute --url="${url}" --file="${file}"`, {
  stdio: "inherit",
  shell: true,
});
console.log("[hotfix] done");
