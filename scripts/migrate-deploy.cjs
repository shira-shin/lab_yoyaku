const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const WEB_SCHEMA = path.join("web", "prisma", "schema.prisma");
const WEB_MIGRATIONS_DIR = path.join(process.cwd(), "web", "prisma", "migrations");
const ROOT_SCHEMA = path.join("prisma", "schema.prisma");
const ROOT_MIGRATIONS_DIR = path.join(process.cwd(), "prisma", "migrations");
const WEB_BACKFILL_SQL = path.join(
  process.cwd(),
  "web",
  "scripts",
  "sql",
  "backfill_normalized_email.sql",
);

function pickSchemaPath() {
  if (fs.existsSync(WEB_SCHEMA)) {
    return `./${WEB_SCHEMA}`;
  }
  return `./${ROOT_SCHEMA}`;
}

function pickMigrationsDir() {
  if (fs.existsSync(WEB_MIGRATIONS_DIR)) {
    return WEB_MIGRATIONS_DIR;
  }
  return ROOT_MIGRATIONS_DIR;
}

function pickBackfillPath() {
  if (fs.existsSync(WEB_BACKFILL_SQL)) {
    return WEB_BACKFILL_SQL;
  }
  return null;
}

function shellQuote(value) {
  return JSON.stringify(value);
}

function run(cmd, options = {}) {
  execSync(cmd, { stdio: "inherit", shell: true, ...options });
}

function findInitMigration(migrationsDir) {
  if (!fs.existsSync(migrationsDir)) return null;
  const directories = fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  return directories.find((name) => name.includes("init")) || null;
}

function main() {
  const schemaPath = pickSchemaPath();
  const migrationsDir = pickMigrationsDir();
  const backfillSqlPath = pickBackfillPath();

  // 1) prisma generate
  run(`pnpm exec prisma generate --schema=${shellQuote(schemaPath)}`);

  // 2) optional backfill
  if (backfillSqlPath) {
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
    const initMigration = findInitMigration(migrationsDir);

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
