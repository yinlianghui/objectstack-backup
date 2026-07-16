import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(process.argv[2] ?? ".");
const failures = [];
const required = [
  "README.md",
  "plan.md",
  "manifest.json",
  "SHA256SUMS",
  "source/generate-fixtures.mjs",
  "source/revalidate-problem-one.ts",
  "source/object-definitions.ts",
  "source/compare-results.mjs",
  "data/qa_seed_item.csv",
  "data/qa_import_item.csv",
  "data/qa_summary_child_single_parent.csv",
  "data/qa_summary_child_ten_parents.csv",
  "data/expected-results.json",
  "data/issue-2678-reconstructed-data-source.xlsx",
  "results/raw-results.json",
  "results/comparison.json",
  "results/comparison-report.md",
  "database/problem-one.sqlite",
  "command-ledger.md",
  "environment/runtime.json",
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

const manifestLines = (await fs.readFile(path.join(root, "SHA256SUMS"), "utf8"))
  .trim().split("\n").filter(Boolean);
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
  if (!await exists(file)) {
    failures.push(`SHA256 target missing: ${relative}`);
    continue;
  }
  const actual = crypto.createHash("sha256").update(await fs.readFile(file)).digest("hex");
  if (actual !== expectedHash) failures.push(`SHA256 mismatch: ${relative}`);
}

const allFiles = await walk(root);
for (const markdownFile of allFiles.filter((file) => file.endsWith(".md"))) {
  const text = await fs.readFile(markdownFile, "utf8");
  for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    let link = match[1].trim().replace(/^<|>$/g, "");
    if (/^(https?:|mailto:|#)/.test(link)) continue;
    link = decodeURIComponent(link.split("#")[0]);
    if (!link) continue;
    const target = path.resolve(path.dirname(markdownFile), link);
    if (!await exists(target)) {
      failures.push(`broken link in ${path.relative(root, markdownFile)}: ${link}`);
    }
  }
}

const comparison = JSON.parse(await fs.readFile(path.join(root, "results/comparison.json"), "utf8"));
if (comparison.exactMatch !== true) failures.push("comparison is not an exact match");
if (comparison.failedChecks?.length !== 0) failures.push("comparison contains failed checks");
if (comparison.checks?.length !== 88) failures.push("comparison does not contain 88 checks");

const formulaScan = await fs.readFile(
  path.join(root, "data/workbook-formula-error-scan.ndjson"),
  "utf8",
);
if (!formulaScan.includes("matched 0 entries")) failures.push("workbook formula scan is not clean");
const workbookInspection = await fs.readFile(
  path.join(root, "data/workbook-inspection.json"),
  "utf8",
);
if (workbookInspection.includes("FAIL")) failures.push("workbook inspection contains FAIL");

for (const csv of [
  "qa_seed_item.csv",
  "qa_import_item.csv",
  "qa_summary_child_single_parent.csv",
  "qa_summary_child_ten_parents.csv",
]) {
  const lines = (await fs.readFile(path.join(root, "data", csv), "utf8")).trim().split("\n");
  if (lines.length !== 1001) failures.push(`${csv} does not contain header + 1,000 rows`);
}
const databaseStat = await fs.stat(path.join(root, "database/problem-one.sqlite"));
if (databaseStat.size === 0) failures.push("SQLite database is empty");

const archiveFileCount = allFiles.length;
console.log(JSON.stringify({
  ok: failures.length === 0,
  archiveFileCount,
  sha256Entries: manifestLines.length,
  markdownFilesChecked: allFiles.filter((file) => file.endsWith(".md")).length,
  comparisonChecks: comparison.checks?.length,
  failures,
}, null, 2));
if (failures.length > 0) process.exitCode = 1;
