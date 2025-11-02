// scripts/migrate-deploy.cjs
// goal:
// 1) generate
// 2) try migrate deploy
// 3) if P3009/P3011 -> reset -> deploy again
// 4) if still bad -> db push --force-reset
// 5) NEVER throw on those prisma-migration errors (so Vercel build continues)

const { execSync } = require("node:child_process");
const fs = require("node:fs");

const WEB_SCHEMA = "./web/prisma/schema.prisma";
const ROOT_SCHEMA = "./prisma/schema.prisma";
const SCHEMA = fs.existsSync(WEB_SCHEMA) ? WEB_SCHEMA : ROOT_SCHEMA;

function run(cmd, opts = {}) {
  const { allowError = false, silent = false } = opts;
  if (!silent) console.log("[migrate] run:", cmd);
  try {
    const out = execSync(cmd, {
      stdio: allowError ? "pipe" : "inherit",
      shell: true,
    });
    return { ok: true, out: out?.toString?.() || "" };
  } catch (err) {
    if (!allowError) {
      throw err;
    }
    const out =
      (err.stdout ? err.stdout.toString() : "") +
      (err.stderr ? err.stderr.toString() : "") +
      (err.message || "");
    return { ok: false, out };
  }
}

function hasPrismaMigrationError(txt) {
  if (!txt) return false;
  return (
    txt.includes("P3009") ||
    txt.includes("P3011") ||
    txt.includes("failed migrations in the target database") ||
    txt.includes("_prisma_migrations")
  );
}

function main() {
  console.log("[migrate] using schema:", SCHEMA);

  // 1) prisma generate
  run(`pnpm exec prisma generate --schema="${SCHEMA}"`);

  // 2) first try: migrate deploy
  const first = run(
    `pnpm exec prisma migrate deploy --schema="${SCHEMA}"`,
    { allowError: true }
  );

  if (first.ok) {
    console.log("[migrate] first deploy OK");
    return;
  }

  console.log("[migrate] first deploy failed (will inspect):");
  console.log(first.out);

  if (hasPrismaMigrationError(first.out)) {
    console.log("[migrate] detected P3009/P3011 -> try RESET");

    // 3) reset
    const reset = run(
      `pnpm exec prisma migrate reset --force --skip-seed --schema="${SCHEMA}"`,
      { allowError: true }
    );
    console.log("[migrate] reset result:");
    console.log(reset.out);

    // 4) try second deploy
    const second = run(
      `pnpm exec prisma migrate deploy --schema="${SCHEMA}"`,
      { allowError: true }
    );
    if (second.ok) {
      console.log("[migrate] deploy OK after reset");
      return;
    }

    console.log("[migrate] still failing after reset:");
    console.log(second.out);

    // 5) final fallback: db push
    console.log("[migrate] final fallback -> prisma db push --force-reset");
    const push = run(
      `pnpm exec prisma db push --force-reset --schema="${SCHEMA}"`,
      { allowError: true }
    );
    console.log("[migrate] db push result:");
    console.log(push.out);

    // even if push failed, at this point we DON'T throw.
    console.log(
      "[migrate] swallow prisma migration error so Vercel build can continue."
    );
    return;
  }

  // ここまで来たら「マイグレーション系じゃない」ので本当に失敗させる
  console.log("[migrate] non-migration error, rethrow");
  throw new Error(first.out || "migrate deploy failed");
}

main();
