import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = path.resolve(process.argv[2] ?? ".");
const failures = [];
const required = [
  "README.md",
  "design.md",
  "test-plan.md",
  "final-report-supplement.md",
  "source-references.md",
  "expected-results.json",
  "versions-and-parameters.json",
  "manifest.json",
  "SHA256SUMS",
  "source/run-hook-qa.ts",
  "source/harness-utils.ts",
  "source/object-definitions.ts",
  "source/compare-results.mjs",
  "source/run-command.sh",
  "results/raw-results.json",
  "results/comparison-report.json",
  "results/comparison-report.md",
  "results/product-issue-afterinsert.md",
  "databases/hook-normal.sqlite",
  "databases/hook-before-error.sqlite",
  "databases/hook-after-error.sqlite",
  "command-ledger.md",
];

async function walk(directory) {
  const files = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    if (entry.isFile()) files.push(absolute);
  }
  return files;
}
const exists = async (target) => fs.access(target).then(() => true, () => false);
for (const relative of required) {
  if (!await exists(path.join(root, relative))) failures.push(`missing required file: ${relative}`);
}

const allFiles = await walk(root);
if (allFiles.some((file) => path.basename(file) === ".DS_Store")) {
  failures.push("archive contains .DS_Store");
}

for (const relative of [
  "expected-results.json",
  "versions-and-parameters.json",
  "manifest.json",
  "results/raw-results.json",
  "results/comparison-report.json",
]) {
  try {
    JSON.parse(await fs.readFile(path.join(root, relative), "utf8"));
  } catch (error) {
    failures.push(`invalid JSON ${relative}: ${error.message}`);
  }
}

const shaPath = path.join(root, "SHA256SUMS");
const manifestLines = (await fs.readFile(shaPath, "utf8"))
  .trim().split("\n").filter(Boolean);
const hashedPaths = new Set();
for (const line of manifestLines) {
  const match = line.match(/^([0-9a-f]{64})  (.+)$/);
  if (!match) {
    failures.push(`invalid SHA256 line: ${line}`);
    continue;
  }
  const [, expectedHash, relative] = match;
  const file = path.resolve(root, relative);
  if (!file.startsWith(`${root}${path.sep}`)) {
    failures.push(`SHA256 path escapes root: ${relative}`);
    continue;
  }
  hashedPaths.add(relative);
  if (!await exists(file)) {
    failures.push(`SHA256 target missing: ${relative}`);
    continue;
  }
  const actualHash = crypto.createHash("sha256")
    .update(await fs.readFile(file)).digest("hex");
  if (actualHash !== expectedHash) failures.push(`SHA256 mismatch: ${relative}`);
}
const expectedHashedPaths = allFiles
  .filter((file) => file !== shaPath)
  .map((file) => path.relative(root, file).split(path.sep).join("/"));
for (const relative of expectedHashedPaths) {
  if (!hashedPaths.has(relative)) failures.push(`file absent from SHA256SUMS: ${relative}`);
}
if (manifestLines.length !== expectedHashedPaths.length) {
  failures.push("SHA256SUMS entry count does not match archive files excluding itself");
}

const manifest = JSON.parse(await fs.readFile(path.join(root, "manifest.json"), "utf8"));
const manifestPaths = new Set(manifest.files?.map((file) => file.path) ?? []);
const expectedManifestPaths = allFiles
  .filter((file) => ![path.join(root, "manifest.json"), shaPath].includes(file))
  .map((file) => path.relative(root, file).split(path.sep).join("/"));
for (const relative of expectedManifestPaths) {
  if (!manifestPaths.has(relative)) failures.push(`file absent from manifest.json: ${relative}`);
}
if (manifest.fileCount !== expectedManifestPaths.length) {
  failures.push("manifest fileCount does not match archive files");
}

for (const markdownFile of allFiles.filter((file) => file.endsWith(".md"))) {
  const text = await fs.readFile(markdownFile, "utf8");
  for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    let link = match[1].trim().replace(/^<|>$/g, "");
    if (/^(https?:|mailto:|#)/.test(link)) continue;
    link = decodeURIComponent(link.split("#")[0]);
    if (!link) continue;
    if (!await exists(path.resolve(path.dirname(markdownFile), link))) {
      failures.push(`broken link in ${path.relative(root, markdownFile)}: ${link}`);
    }
  }
}

const raw = JSON.parse(await fs.readFile(path.join(root, "results/raw-results.json"), "utf8"));
const comparison = JSON.parse(await fs.readFile(
  path.join(root, "results/comparison-report.json"),
  "utf8",
));
if (raw.provenance?.frameworkActualSha !== "98874656ffc50ce1531af52346228ffcdda73fba") {
  failures.push("raw results Framework SHA mismatch");
}
if (comparison.status !== "fail"
  || comparison.totalChecks !== 83
  || comparison.passedChecks !== 45
  || comparison.failedChecks !== 38) {
  failures.push("comparison totals/status differ from the documented expected finding");
}
if (comparison.knownIssue2922Detected !== true) {
  failures.push("comparison did not reproduce known issue #2922");
}
if (comparison.afterInsertPersistenceMismatchObserved !== true) {
  failures.push("comparison did not capture the afterInsert persistence mismatch");
}
if (comparison.categorySummary?.summary?.failed !== 0) {
  failures.push("summary comparison contains an unexpected failure");
}

const csvRows = {
  "inputs/qa_seed_item.csv": 1001,
  "inputs/qa_import_item.csv": 1001,
  "inputs/qa_summary_child_single_parent.csv": 1001,
  "inputs/qa_summary_child_ten_parents.csv": 1001,
  "inputs/qa_summary_parents.csv": 12,
  "inputs/hook-before-error.csv": 6,
  "inputs/hook-after-error.csv": 6,
};
for (const [relative, expectedLines] of Object.entries(csvRows)) {
  const lines = (await fs.readFile(path.join(root, relative), "utf8")).trim().split("\n");
  if (lines.length !== expectedLines) {
    failures.push(`${relative} has ${lines.length} lines, expected ${expectedLines}`);
  }
}

function sqliteScalar(database, sql) {
  return execFileSync("sqlite3", [path.join(root, database), sql], { encoding: "utf8" }).trim();
}
const databaseExpectations = [
  {
    path: "databases/hook-normal.sqlite",
    tables: "qa_import_item,qa_seed_item,qa_summary_child,qa_summary_parent",
    counts: [
      ["qa_seed_item", "1000"],
      ["qa_import_item", "1000"],
      ["qa_summary_child", "2000"],
      ["qa_summary_parent", "11"],
    ],
    scalars: [
      ["SELECT SUM(amount) FROM qa_seed_item;", "500500.0"],
      ["SELECT SUM(amount) FROM qa_import_item;", "500500.0"],
      ["SELECT SUM(amount) FROM qa_summary_child;", "1001000.0"],
      ["SELECT SUM(total_amount) FROM qa_summary_parent;", "1001000.0"],
      ["SELECT COUNT(*) FROM qa_summary_child c LEFT JOIN qa_summary_parent p ON p.id=c.parent_id WHERE p.id IS NULL;", "0"],
    ],
  },
  {
    path: "databases/hook-before-error.sqlite",
    tables: "qa_hook_before_error",
    counts: [["qa_hook_before_error", "5"]],
    scalars: [
      ["SELECT COUNT(*) FROM qa_hook_before_error WHERE external_key='HOOK-BEFORE-03';", "1"],
      ["SELECT COUNT(*) FROM qa_hook_before_error WHERE hook_marker IS NOT NULL;", "0"],
    ],
  },
  {
    path: "databases/hook-after-error.sqlite",
    tables: "qa_hook_after_error",
    counts: [["qa_hook_after_error", "5"]],
    scalars: [["SELECT SUM(amount) FROM qa_hook_after_error;", "15.0"]],
  },
];
for (const database of databaseExpectations) {
  if (sqliteScalar(database.path, "PRAGMA integrity_check;") !== "ok") {
    failures.push(`${database.path} failed PRAGMA integrity_check`);
  }
  const tables = sqliteScalar(
    database.path,
    "SELECT group_concat(name, ',') FROM (SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name);",
  );
  if (tables !== database.tables) failures.push(`${database.path} table list mismatch: ${tables}`);
  for (const [table, count] of database.counts) {
    if (sqliteScalar(database.path, `SELECT COUNT(*) FROM ${table};`) !== count) {
      failures.push(`${database.path} row count mismatch for ${table}`);
    }
  }
  for (const [sql, expected] of database.scalars) {
    if (sqliteScalar(database.path, sql) !== expected) {
      failures.push(`${database.path} scalar mismatch for: ${sql}`);
    }
  }
}

const ledger = await fs.readFile(path.join(root, "command-ledger.md"), "utf8");
const commandIds = [...ledger.matchAll(/^## (\S+)$/gm)].map((match) => match[1]);
for (const id of commandIds) {
  for (const stream of ["stdout", "stderr"]) {
    if (!await exists(path.join(root, "commands", `${id}.${stream}.log`))) {
      failures.push(`missing ${stream} log for command ${id}`);
    }
  }
}
if (!commandIds.includes("014-run-hook-qa") || !commandIds.includes("016-run-hook-qa")) {
  failures.push("ledger does not preserve both failed ESM startup and successful harness run");
}

const versionLog = await fs.readFile(
  path.join(root, "commands/004-runtime-versions.stdout.log"),
  "utf8",
);
for (const label of ["Serial Number (system)", "Hardware UUID", "Provisioning UDID"]) {
  const line = versionLog.split("\n").find((candidate) => candidate.includes(label));
  if (!line?.includes("[REDACTED: host-unique identifier]")) {
    failures.push(`${label} was not redacted from runtime evidence`);
  }
}

const reportText = await fs.readFile(path.join(root, "final-report-supplement.md"), "utf8");
for (const requiredPhrase of [
  "45 项通过、38 项失败",
  "#3153",
  "候选问题备忘",
  "已关闭",
  "不宣称已复验该修复",
  "本任务未修改 Framework 产品代码",
]) {
  if (!reportText.includes(requiredPhrase)) failures.push(`final report missing phrase: ${requiredPhrase}`);
}

console.log(JSON.stringify({
  ok: failures.length === 0,
  archiveFileCount: allFiles.length,
  sha256Entries: manifestLines.length,
  manifestFiles: manifest.fileCount,
  markdownFilesChecked: allFiles.filter((file) => file.endsWith(".md")).length,
  commandCount: commandIds.length,
  comparison: {
    passed: comparison.passedChecks,
    failed: comparison.failedChecks,
    total: comparison.totalChecks,
  },
  sqliteFilesChecked: databaseExpectations.length,
  failures,
}, null, 2));
if (failures.length > 0) process.exitCode = 1;
