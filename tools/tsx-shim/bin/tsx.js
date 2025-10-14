#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const Module = require("node:module");

const [, , ...args] = process.argv;

if (args.length === 0) {
  console.error("Usage: tsx <file> [args...]");
  process.exit(1);
}

const [entry, ...rest] = args;
const entryPath = path.resolve(process.cwd(), entry);
const requireFromEntry = Module.createRequire(entryPath);

let ts;
try {
  ts = requireFromEntry("typescript");
} catch (error) {
  console.error("tsx shim could not resolve 'typescript'. Install it in the invoking project.");
  console.error(error);
  process.exit(1);
}

const source = fs.readFileSync(entryPath, "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    esModuleInterop: true,
  },
  fileName: entryPath,
});

const script = new vm.Script(transpiled.outputText, { filename: entryPath });
const sandbox = {
  require: requireFromEntry,
  module: { exports: {} },
  exports: {},
  __filename: entryPath,
  __dirname: path.dirname(entryPath),
  process: { ...process, argv: [process.argv[0], entryPath, ...rest] },
  console,
  Buffer,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
};

sandbox.global = sandbox;
script.runInNewContext(sandbox);
