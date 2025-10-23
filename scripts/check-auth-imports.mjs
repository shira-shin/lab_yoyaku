import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

const PROJECT_ROOT = fileURLToPath(new URL("../", import.meta.url));
const ALLOWED_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const IGNORED_DIRS = new Set([".git", "node_modules", ".next", "dist", "build", "coverage", "out", "tmp"]);
const RELATIVE_AUTH_IMPORT = new RegExp(String.raw`(['"])(?:\.\./)+auth(?:/|['"])`, "g");
const CORE_IMPORT_PATTERN = /from\s+['"]@auth\/core(?:\/providers)?['"]/g;
const CORE_REQUIRE_PATTERN = /require\(['"]@auth\/core(?:\/providers)?['"]\)/g;

async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    if (IGNORED_DIRS.has(entry.name)) continue;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(fullPath);
    } else if (ALLOWED_EXTS.has(extname(entry.name))) {
      yield fullPath;
    }
  }
}

function extractDefaultProviderNames(spec) {
  const names = new Set();

  const defaultMatch = spec.match(/^([A-Za-z_$][\w$]*)\s*(?:,|$)/);
  if (defaultMatch) {
    const candidate = defaultMatch[1];
    if (candidate !== "type" && candidate !== "*") {
      names.add(candidate);
    }
  }

  for (const braces of spec.matchAll(/\{([^}]*)\}/g)) {
    const parts = braces[1].split(",");
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      if (/^default\s+as\s+/i.test(trimmed)) {
        const alias = trimmed.split(/\s+as\s+/i)[1]?.trim();
        if (alias) {
          names.add(alias);
        }
      }
    }
  }

  return [...names];
}

const MANIFEST_PATHS = [
  "package.json",
  "web/package.json",
];

async function checkManifests(issues) {
  for (const manifestRelPath of MANIFEST_PATHS) {
    const manifestPath = join(PROJECT_ROOT, manifestRelPath);
    let manifest;

    try {
      manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    } catch (error) {
      if (error && error.code === "ENOENT") {
        continue;
      }
      throw error;
    }

    const manifestIssues = new Set();
    const { dependencies = {}, devDependencies = {}, optionalDependencies = {}, peerDependencies = {} } = manifest;

    if (dependencies["@auth/core"]) {
      manifestIssues.add("Do not declare '@auth/core' as a dependency; rely on 'next-auth' to provide it.");
    }
    if (devDependencies["@auth/core"]) {
      manifestIssues.add("Do not declare '@auth/core' as a devDependency.");
    }
    if (optionalDependencies["@auth/core"]) {
      manifestIssues.add("Do not declare '@auth/core' as an optional dependency.");
    }
    if (peerDependencies["@auth/core"]) {
      manifestIssues.add("Do not declare '@auth/core' as a peer dependency.");
    }

    if (manifestIssues.size > 0) {
      issues.push({ file: manifestRelPath, messages: [...manifestIssues] });
    }
  }
}

async function main() {
  const issues = [];

  for await (const file of walk(PROJECT_ROOT)) {
    const relPath = relative(PROJECT_ROOT, file);
    if (relPath === "scripts/check-auth-imports.mjs") {
      continue;
    }
    const content = await readFile(file, "utf8");
    const fileIssues = new Set();

    if (RELATIVE_AUTH_IMPORT.test(content)) {
      fileIssues.add("Do not import auth helpers via relative paths (use '@/auth').");
    }

    if (CORE_IMPORT_PATTERN.test(content) || CORE_REQUIRE_PATTERN.test(content)) {
      fileIssues.add("Do not import from '@auth/core'; rely on 'next-auth' exports instead.");
    }

    const providerNames = new Set();
    const importRegex = /import\s+([\s\S]+?)\s+from\s+["']([^"']+)["']/g;
    let match;
    while ((match = importRegex.exec(content))) {
      let spec = match[1].trim();
      const source = match[2];

      const isTypeOnly = spec.startsWith("type ");
      if (isTypeOnly) {
        spec = spec.slice(5).trim();
      }

      if (source === "next-auth/providers") {
        fileIssues.add('Import providers from "next-auth/providers/<provider>" instead of the root module.');
        continue;
      }

      if (!source.startsWith("next-auth/providers/")) {
        continue;
      }

      if (isTypeOnly) {
        continue;
      }

      const names = extractDefaultProviderNames(spec);
      for (const name of names) {
        providerNames.add(name);
      }
    }

    for (const name of providerNames) {
      const callPattern = new RegExp(`\\b${name}\\s*\\(`, "g");
      if (callPattern.test(content)) {
        fileIssues.add(`Provider "${name}" must be passed directly without calling it.`);
      }
      const newPattern = new RegExp(`new\\s+${name}\\s*\\(`, "g");
      if (newPattern.test(content)) {
        fileIssues.add(`Provider "${name}" must not be instantiated with 'new'.`);
      }
    }

    if (fileIssues.size > 0) {
      issues.push({ file: relPath, messages: [...fileIssues] });
    }
  }

  await checkManifests(issues);

  if (issues.length > 0) {
    console.error("Auth import check failed:");
    for (const { file, messages } of issues) {
      for (const message of messages) {
        console.error(` - ${file}: ${message}`);
      }
    }
    process.exit(1);
  }

  console.log("Auth import patterns look good.");
}

main().catch((error) => {
  console.error("check-auth-imports failed:", error);
  process.exit(1);
});
