const path = require("node:path");
const fs = require("node:fs/promises");
const { spawnSync } = require("node:child_process");

const run = (cmd, { cwd = process.cwd(), env = process.env } = {}) => {
  console.log("[migrate] run:", cmd);
  const result = spawnSync(cmd, {
    shell: true,
    cwd,
    env,
    encoding: "utf8",
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  if (result.status !== 0) {
    const error = new Error(`Command failed: ${cmd}`);
    error.result = result;
    throw error;
  }

  return result;
};

const getCommandOutput = (error) => {
  if (!error?.result) return "";
  const { stdout = "", stderr = "" } = error.result;
  return `${stdout}\n${stderr}`;
};

const findInitMigration = async () => {
  const migrationsPath = path.resolve(cwd, "prisma/migrations");
  const entries = await fs.readdir(migrationsPath, { withFileTypes: true });
  const initMigration = entries.find(
    (entry) => entry.isDirectory() && entry.name.endsWith("_init")
  );

  return initMigration?.name;
};

const migrateCommand =
  "pnpm exec prisma migrate deploy --schema=./prisma/schema.prisma";

const runMigrateWithSelfHeal = async () => {
  try {
    run(migrateCommand, { cwd });
    return;
  } catch (error) {
    const output = getCommandOutput(error);
    if (!output.includes("P3009") || !output.includes("The `init` migration started at")) {
      throw error;
    }

    const initMigration = await findInitMigration();
    if (!initMigration) {
      throw error;
    }

    console.log(
      "[migrate] detected P3009 for init, attempting prisma migrate resolve --rolled-back ..."
    );
    run(
      `pnpm exec prisma migrate resolve --schema=./prisma/schema.prisma --rolled-back ${initMigration}`,
      { cwd }
    );

    console.log("[migrate] re-running prisma migrate deploy ...");
    try {
      run(migrateCommand, { cwd });
    } catch (retryError) {
      console.error(
        "[migrate] prisma migrate deploy failed again after resolving init. Neon の _prisma_migrations に failed=1 のレコードがあるから手動で直せ。"
      );
      process.exit(1);
      throw retryError;
    }
  }
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
  await runMigrateWithSelfHeal();
  // 4. ensure bootstrap admin user when configured
  run("pnpm exec tsx scripts/ensure-admin.ts", { cwd });
}

main().catch((error) => {
  console.error("[migrate] failed", error);
  process.exitCode = 1;
});
