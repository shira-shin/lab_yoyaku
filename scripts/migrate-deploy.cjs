const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const schemaPath = "./web/prisma/schema.prisma";
const migrationsDir = path.join(process.cwd(), "web", "prisma", "migrations");
const backfillSqlPath = path.join(
  process.cwd(),
  "web",
  "scripts",
  "sql",
  "backfill_normalized_email.sql",
);

function shellQuote(value) {
  return JSON.stringify(value);
}

function run(cmd, options = {}) {
  execSync(cmd, { stdio: "inherit", shell: true, ...options });
}

function findInitMigration() {
  if (!fs.existsSync(migrationsDir)) return null;
  const files = fs.readdirSync(migrationsDir);
  return files.find((file) => file.endsWith("_init")) || null;
}

function main() {
  // 1) prisma generate
  run(`pnpm exec prisma generate --schema=${shellQuote(schemaPath)}`);

  // 2) optional backfill
  if (fs.existsSync(backfillSqlPath)) {
    const directUrl = process.env.DIRECT_URL;
    if (!directUrl) {
      console.warn("[migrate] skip normalizedEmail backfill because DIRECT_URL is not set");
    } else {
      run(
        `pnpm exec prisma db execute --schema=${shellQuote(schemaPath)} --file=${shellQuote(backfillSqlPath)}`,
        {
          env: {
            ...process.env,
            DIRECT_URL: directUrl,
            DATABASE_URL: directUrl,
          },
        },
      );
    }
  }

  // 3) migrate deploy
  try {
    run(`pnpm exec prisma migrate deploy --schema=${shellQuote(schemaPath)}`);
  } catch (err) {
    const output = String(err?.stdout || err?.stderr || err?.message || err);
    const initMigration = findInitMigration();

    if (output.includes("P3009") && initMigration) {
      console.log("[migrate] detected P3009, trying to resolve:", initMigration);
      run(
        `pnpm exec prisma migrate resolve --schema=${shellQuote(schemaPath)} --rolled-back ${shellQuote(initMigration)}`,
      );
      console.log("[migrate] re-running prisma migrate deploy ...");
      run(`pnpm exec prisma migrate deploy --schema=${shellQuote(schemaPath)}`);
    } else {
      throw err;
    }
  }
}

main();
