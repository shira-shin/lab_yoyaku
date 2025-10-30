const path = require("node:path");
const { execSync } = require("node:child_process");

const run = (cmd, cwd = process.cwd()) => {
  console.log("[migrate] run:", cmd);
  execSync(cmd, { stdio: "inherit", cwd });
};

const cwd = path.resolve(__dirname, "../web");

// 1. generate
run("pnpm exec prisma generate --schema=./prisma/schema.prisma", cwd);
// 2. migrate
run("pnpm exec prisma migrate deploy --schema=./prisma/schema.prisma", cwd);
