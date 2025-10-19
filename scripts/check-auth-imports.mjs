import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

const PROJECT_ROOT = fileURLToPath(new URL("../", import.meta.url));
const WEB_SRC = fileURLToPath(new URL("../web/src", import.meta.url));
const ALLOWED_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const AUTH_IMPORT_PATTERN = new RegExp(String.raw`(?:['"])(?:\.\./)+auth(?:/|['"])`, 'g');

async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(fullPath);
    } else if (ALLOWED_EXTS.has(extname(entry.name))) {
      yield fullPath;
    }
  }
}

async function main() {
  const offenders = [];
  for await (const file of walk(WEB_SRC)) {
    const content = await readFile(file, "utf8");
    const matches = content.match(AUTH_IMPORT_PATTERN);
    if (matches) {
      offenders.push({
        file,
        matches: [...new Set(matches)],
      });
    }
  }

  if (offenders.length > 0) {
    console.error("Found forbidden auth imports:");
    for (const { file, matches } of offenders) {
      const rel = relative(PROJECT_ROOT, file);
      console.error(' - ' + rel + ': ' + matches.join(', '));
    }
    process.exit(1);
  }

  console.log("No relative auth imports detected.");
}

main().catch((error) => {
  console.error("check-auth-imports failed:", error);
  process.exit(1);
});
