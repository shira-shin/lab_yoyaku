const path = require("node:path");
const fs = require("node:fs/promises");
const { execSync } = require("node:child_process");

const run = (cmd, { cwd = process.cwd(), env = process.env } = {}) => {
  console.log("[migrate] run:", cmd);
  execSync(cmd, { stdio: "inherit", cwd, env });
};

const cwd = path.resolve(__dirname, "../web");
const sqlPath = path.resolve(
  __dirname,
  "../web/scripts/sql/backfill_normalized_email.sql"
);

async function backfillNormalizedEmails() {
  const directUrl = process.env.DIRECT_URL;
  if (!directUrl) {
    console.warn(
      "[migrate] skip normalizedEmail backfill because DIRECT_URL is not set"
    );
    return;
  }

  try {
    await fs.access(sqlPath);
  } catch (error) {
    console.warn("[migrate] backfill SQL not found", error);
    return;
  }

  console.log("[migrate] backfilling normalizedEmail values");
  run(
    "pnpm exec prisma db execute --schema=./prisma/schema.prisma --file=./scripts/sql/backfill_normalized_email.sql",
    {
      cwd,
      env: { ...process.env, DATABASE_URL: directUrl, DIRECT_URL: directUrl },
    }
  );
}

async function main() {
  // 1. generate
  run("pnpm exec prisma generate --schema=./prisma/schema.prisma", { cwd });
  // 2. backfill normalizedEmail before running migrations
  await backfillNormalizedEmails();
  // 3. migrate
  run("pnpm exec prisma migrate deploy --schema=./prisma/schema.prisma", { cwd });
}

main().catch((error) => {
  console.error("[migrate] failed", error);
  process.exitCode = 1;
});
