import fs from "node:fs/promises";
import path from "node:path";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  args.set(process.argv[index], process.argv[index + 1]);
}
const rawPath = path.resolve(args.get("--raw") ?? "");
const expectedPath = path.resolve(args.get("--expected") ?? "");
const jsonPath = path.resolve(args.get("--json-output") ?? "");
const markdownPath = path.resolve(args.get("--markdown-output") ?? "");
const [raw, expected] = await Promise.all([
  fs.readFile(rawPath, "utf8").then(JSON.parse),
  fs.readFile(expectedPath, "utf8").then(JSON.parse),
]);

const checks = [];
const add = (name, expectedValue, actualValue) => {
  const passed = JSON.stringify(actualValue) === JSON.stringify(expectedValue);
  checks.push({ name, expected: expectedValue, actual: actualValue, passed });
};
const sizes = (calls) => calls.map((call) => call.rows);
const datasetResult = (result) => result?.results?.[0] ?? result?.datasets?.[0] ?? result;
const seedExpected = expected.datasets.qa_seed_item;
const importExpected = expected.datasets.qa_import_item;
const singleExpected = expected.summary.singleParent;
const tenExpected = expected.summary.tenParents;

add("Framework fixed SHA", expected.frameworkSha, raw.framework.actualSha);
add("Harness provenance", expected.provenance, raw.provenance);
add("Batch size", expected.batchSize, raw.parameters.batchSize);
add("Seed batch write count", seedExpected.batchWrites, raw.seed.batchCalls);
add("Seed batch sizes", Array(5).fill(200), sizes(raw.seed.observedInsertCalls));
add("Seed single write count", seedExpected.singleWrites, raw.seed.singleCalls);
add("Seed loader inserted", seedExpected.rowCount, datasetResult(raw.seed.loaderResult)?.inserted);
add("Seed loader errors", 0, datasetResult(raw.seed.loaderResult)?.errored);
add("Seed database row count", seedExpected.rowCount, raw.seed.databaseAudit.row_count);
add("Seed unique external keys", seedExpected.uniqueKeyCount, raw.seed.databaseAudit.unique_external_keys);
add("Seed amount minimum", seedExpected.amountMin, raw.seed.databaseAudit.min_amount);
add("Seed amount maximum", seedExpected.amountMax, raw.seed.databaseAudit.max_amount);
add("Seed amount resummed", seedExpected.amountSum, raw.seed.databaseAudit.amount_sum);
add("Seed active=true", seedExpected.activeTrue, raw.seed.databaseAudit.active_true);

add("Import HTTP status", 200, raw.import.httpStatus);
add("Import total", importExpected.rowCount, raw.import.routeResponse?.total);
add("Import successful rows", importExpected.rowCount, raw.import.routeResponse?.ok);
add("Import created rows", importExpected.rowCount, raw.import.routeResponse?.created);
add("Import error rows", 0, raw.import.routeResponse?.errors);
add("Import batch count", importExpected.batches, raw.import.observedCreateManyCalls.length);
add("Import batch sizes", Array(5).fill(200), sizes(raw.import.observedCreateManyCalls));
add("Import single-create count", 0, raw.import.observedCreateOneCalls.length);
add("Import database row count", importExpected.rowCount, raw.import.databaseAudit.row_count);
add("Import unique external keys", importExpected.uniqueKeyCount, raw.import.databaseAudit.unique_external_keys);
add("Import amount minimum", importExpected.amountMin, raw.import.databaseAudit.min_amount);
add("Import amount maximum", importExpected.amountMax, raw.import.databaseAudit.max_amount);
add("Import amount resummed", importExpected.amountSum, raw.import.databaseAudit.amount_sum);
add("Import active=true", importExpected.activeTrue, raw.import.databaseAudit.active_true);

const single = raw.summaries.singleParent;
const ten = raw.summaries.tenParents;
add("Single-parent loader inserted", singleExpected.rowCount, datasetResult(single.loaderResult)?.inserted);
add("Single-parent loader errors", 0, datasetResult(single.loaderResult)?.errored);
add("Single-parent batch sizes", Array(5).fill(200), sizes(single.observedInsertCalls));
add("Single-parent summary recomputes", singleExpected.expectedRecomputeCalls, single.observedAggregateCalls.length);
add("Single-parent summary parent updates", singleExpected.expectedRecomputeCalls, single.observedParentUpdates.length);
add(
  "Single-parent recompute target",
  Array(singleExpected.expectedRecomputeCalls).fill("parent_single"),
  single.observedAggregateCalls.map((call) => call.parentId),
);
add("Ten-parent loader inserted", tenExpected.rowCount, datasetResult(ten.loaderResult)?.inserted);
add("Ten-parent loader errors", 0, datasetResult(ten.loaderResult)?.errored);
add("Ten-parent batch sizes", Array(5).fill(200), sizes(ten.observedInsertCalls));
add("Ten-parent summary recomputes", tenExpected.expectedRecomputeCalls, ten.observedAggregateCalls.length);
add("Ten-parent summary parent updates", tenExpected.expectedRecomputeCalls, ten.observedParentUpdates.length);
const actualTenTargetCounts = Object.fromEntries(
  tenExpected.parents.map((parent) => [
    parent.id,
    ten.observedAggregateCalls.filter((call) => call.parentId === parent.id).length,
  ]),
);
add(
  "Ten-parent recomputes per parent",
  Object.fromEntries(tenExpected.parents.map((parent) => [parent.id, 5])),
  actualTenTargetCounts,
);

const childByParent = new Map(
  raw.summaries.childDatabaseAudit.map((row) => [row.parent_id, row]),
);
const parentById = new Map(
  raw.summaries.parentDatabaseAudit.map((row) => [row.id, row]),
);
for (const parent of [...singleExpected.parents, ...tenExpected.parents]) {
  const child = childByParent.get(parent.id);
  const storedParent = parentById.get(parent.id);
  add(`${parent.id} child row count`, parent.expected_child_count, child?.row_count);
  add(`${parent.id} unique child keys`, parent.expected_child_count, child?.unique_external_keys);
  add(`${parent.id} child amount sum`, parent.expected_total_amount, child?.amount_sum);
  add(`${parent.id} stored summary`, parent.expected_total_amount, storedParent?.total_amount);
}
add("Summary child parent groups", 11, raw.summaries.childDatabaseAudit.length);
add("Summary parent records", 11, raw.summaries.parentDatabaseAudit.length);
add("Orphan child records", 0, raw.summaries.orphanCount);
const integrityValue = raw.sqlite.integrityCheck?.[0]
  ? Object.values(raw.sqlite.integrityCheck[0])[0]
  : undefined;
add("SQLite integrity_check", "ok", integrityValue);

const failedChecks = checks.filter((check) => !check.passed);
const comparison = {
  schemaVersion: 1,
  comparedAt: new Date().toISOString(),
  exactMatch: failedChecks.length === 0,
  historicalConclusion: failedChecks.length === 0
    ? "Problem one remains consistent with the final QA report."
    : "STOP: reconstructed revalidation differs from the final QA report.",
  checks,
  failedChecks,
};
await fs.mkdir(path.dirname(jsonPath), { recursive: true });
await fs.writeFile(jsonPath, JSON.stringify(comparison, null, 2) + "\n");

const printable = (value) => {
  const text = JSON.stringify(value);
  return text.length > 160 ? `${text.slice(0, 157)}...` : text;
};
const lines = [
  "# Issue #2678 Problem One — Reconstructed Revalidation Comparison",
  "",
  `- Result: **${comparison.exactMatch ? "EXACT MATCH" : "MISMATCH — STOP"}**`,
  `- Framework SHA: \`${raw.framework.actualSha}\``,
  `- Compared at: \`${comparison.comparedAt}\``,
  "- Scope: Problem one only (bulk write and summary calculation).",
  "- Provenance: Data source reconstructed from the final report and revalidated; the original temporary fixture no longer exists.",
  "",
  "| Check | Expected | Actual | Result |",
  "|---|---:|---:|:---:|",
  ...checks.map((check) => `| ${check.name} | \`${printable(check.expected)}\` | \`${printable(check.actual)}\` | ${check.passed ? "PASS" : "FAIL"} |`),
  "",
  comparison.historicalConclusion,
  "",
];
await fs.writeFile(markdownPath, lines.join("\n"));
console.log(JSON.stringify({
  exactMatch: comparison.exactMatch,
  totalChecks: checks.length,
  failedChecks: failedChecks.length,
}, null, 2));
if (!comparison.exactMatch) process.exitCode = 2;
