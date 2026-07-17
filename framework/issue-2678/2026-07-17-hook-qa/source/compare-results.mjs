import fs from "node:fs";
import path from "node:path";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  args.set(process.argv[index], process.argv[index + 1]);
}
const expectedPath = path.resolve(args.get("--expected") ?? "expected-results.json");
const actualPath = path.resolve(args.get("--actual") ?? "results/raw-results.json");
const outputPath = path.resolve(args.get("--output") ?? "results/comparison-report.json");

if (!fs.existsSync(actualPath)) {
  console.error(`RAW_RESULTS_MISSING: ${actualPath}`);
  process.exit(66);
}
const expected = JSON.parse(fs.readFileSync(expectedPath, "utf8"));
const actual = JSON.parse(fs.readFileSync(actualPath, "utf8"));
const checks = [];

function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function check(id, category, expectedValue, actualValue, note = undefined) {
  checks.push({
    id,
    category,
    expected: expectedValue,
    actual: actualValue,
    pass: same(expectedValue, actualValue),
    ...(note ? { note } : {}),
  });
}

function integrityValue(database) {
  return database.integrityCheck?.[0]?.integrity_check
    ?? database.integrityCheck?.[0]?.["integrity_check"]
    ?? null;
}

function normalChecks(name, expectedCase, actualCase, options = {}) {
  const prefix = `normal.${name}`;
  check(`${prefix}.before.calls`, "hook", expectedCase.beforeInsertCalls, actualCase.beforeInsertCalls);
  check(`${prefix}.before.shape`, "hook", [expectedCase.inputShape ?? "record"], actualCase.beforeShapes);
  check(`${prefix}.after.calls`, "hook", expectedCase.afterInsertCalls, actualCase.afterInsertCalls);
  check(`${prefix}.after.shape`, "hook", [expectedCase.resultShape ?? "record"], actualCase.afterShapes);
  check(`${prefix}.engine-insert`, "write", expectedCase.engineInsertCalls ?? 5, actualCase.engineInsertCalls);
  check(`${prefix}.driver-bulk-create`, "write", expectedCase.driverBulkCreateCalls, actualCase.driverBulkCreateCalls);
  check(`${prefix}.driver-create`, "write", expectedCase.driverCreateCalls ?? 0, actualCase.driverCreateAttempts);
  check(`${prefix}.batch-boundaries`, "write", expectedCase.batchBoundaries, actualCase.batchBoundaries);
  if (options.database) {
    check(`${prefix}.db.rows`, "database", expectedCase.persistedRows, options.database.row_count);
    check(`${prefix}.db.hook-markers`, "database", expectedCase.persistedHookMarkers, options.database.hook_markers);
  }
}

normalChecks("seed", expected.normal.seed, actual.normal.seed, {
  database: actual.normal.seed.database,
});
normalChecks("import", expected.normal.import, actual.normal.import, {
  database: actual.normal.import.database,
});
check(
  "normal.seed.session",
  "hook",
  expected.normal.seed.session,
  actual.normal.trace.find(
    (entry) => entry.phase === "seed" && entry.source === "hook",
  )?.session,
);
check(
  "normal.import.protocol-create-many",
  "write",
  expected.normal.import.protocolCreateManyCalls,
  actual.normal.import.protocolCreateManyCalls,
);
check(
  "normal.import.protocol-create-one",
  "write",
  expected.normal.import.protocolCreateOneCalls,
  actual.normal.import.protocolCreateOneCalls,
);
check(
  "normal.import.http-errors",
  "exception",
  expected.normal.import.httpErrors,
  actual.normal.import.httpStatus >= 400 ? 1 : 0,
);

function summaryChecks(name, expectedCase, actualCase, markerCount) {
  const prefix = `normal.${name}`;
  check(`${prefix}.child-before.calls`, "hook", expectedCase.childBeforeInsertCalls, actualCase.beforeInsertCalls);
  check(`${prefix}.child-before.shape`, "hook", ["record"], actualCase.beforeShapes);
  check(`${prefix}.child-after.calls`, "hook", expectedCase.childAfterInsertCalls, actualCase.afterInsertCalls);
  check(`${prefix}.child-after.shape`, "hook", ["record"], actualCase.afterShapes);
  check(`${prefix}.child-bulk-create`, "write", expectedCase.childDriverBulkCreateCalls, actualCase.driverBulkCreateCalls);
  check(`${prefix}.child-markers`, "database", expectedCase.childPersistedHookMarkers, markerCount);
  check(`${prefix}.aggregate.calls`, "summary", expectedCase.summaryAggregateCalls, actualCase.aggregateCalls);
  check(`${prefix}.parent-before.calls`, "hook", expectedCase.parentBeforeUpdateCalls, actualCase.parentBeforeUpdateCalls);
  check(`${prefix}.parent-after.calls`, "hook", expectedCase.parentAfterUpdateCalls, actualCase.parentAfterUpdateCalls);
  check(`${prefix}.parent-update-values`, "summary", expectedCase.parentUpdateValues, actualCase.parentUpdateValues);
  if (expectedCase.parentPreviousValues) {
    check(`${prefix}.parent-previous-values`, "hook", expectedCase.parentPreviousValues, actualCase.parentPreviousValues);
  }
}

summaryChecks(
  "single-parent",
  expected.normal.singleParent,
  actual.normal.singleParent,
  actual.normal.database.childMarkers.single_markers,
);
const tenExpected = {
  ...expected.normal.tenParents,
  parentUpdateValues: expected.normal.tenParents.cumulativeTotalsByBatch.flat(),
};
summaryChecks(
  "ten-parents",
  tenExpected,
  actual.normal.tenParents,
  actual.normal.database.childMarkers.ten_markers,
);
check(
  "normal.ten-parents.parent-order",
  "summary",
  Array.from({ length: 5 }, () => expected.normal.tenParents.parentOrderPerBatch).flat(),
  actual.normal.tenParents.parentOrder,
);

const finalParents = Object.fromEntries(
  actual.normal.database.parents.map((row) => [row.id, row.total_amount]),
);
check(
  "normal.single-parent.final-total",
  "database",
  expected.normal.singleParent.finalTotal,
  finalParents.parent_single,
);
check(
  "normal.ten-parents.final-totals",
  "database",
  expected.normal.tenParents.finalTotals,
  expected.normal.tenParents.parentOrderPerBatch.map((id) => finalParents[id]),
);
check(
  "normal.ten-parents.combined-total",
  "database",
  expected.normal.tenParents.combinedTotal,
  expected.normal.tenParents.parentOrderPerBatch.reduce(
    (sum, id) => sum + Number(finalParents[id] ?? 0),
    0,
  ),
);
check("normal.sqlite.integrity", "database", "ok", integrityValue(actual.normal.database));
check("normal.sqlite.non-qa-tables", "database", [], actual.normal.database.nonQaTables);

function batchOrderObservations(trace, phase, object) {
  const inserts = trace.filter(
    (entry) => entry.phase === phase
      && entry.source === "engine"
      && entry.event === "insert"
      && entry.object === object,
  );
  return inserts.map((insert, index) => {
    const nextSeq = inserts[index + 1]?.seq ?? Number.POSITIVE_INFINITY;
    const block = trace.filter(
      (entry) => entry.phase === phase && entry.seq >= insert.seq && entry.seq < nextSeq,
    );
    const before = block.filter(
      (entry) => entry.source === "hook" && entry.event === "beforeInsert" && entry.object === object,
    );
    const bulk = block.filter(
      (entry) => entry.source === "driver" && entry.event === "bulkCreate" && entry.object === object,
    );
    const after = block.filter(
      (entry) => entry.source === "hook" && entry.event === "afterInsert" && entry.object === object,
    );
    const bulkSeq = bulk[0]?.seq ?? -1;
    return {
      rows: insert.rows,
      beforeCount: before.length,
      bulkCount: bulk.length,
      afterCount: after.length,
      beforeShapes: [...new Set(before.map((entry) => entry.shape))],
      afterShapes: [...new Set(after.map((entry) => entry.shape))],
      beforeAllBeforeBulk: before.every((entry) => entry.seq < bulkSeq),
      afterAllAfterBulk: after.every((entry) => entry.seq > bulkSeq),
      boundary: [bulk[0]?.firstKey ?? null, bulk[0]?.lastKey ?? null],
    };
  });
}

for (const [phase, object] of [
  ["seed", "qa_seed_item"],
  ["import", "qa_import_item"],
  ["single-parent", "qa_summary_child"],
  ["ten-parents", "qa_summary_child"],
]) {
  const observed = batchOrderObservations(actual.normal.trace, phase, object);
  const expectedOrder = observed.map((batch) => ({
    rows: batch.rows,
    beforeCount: batch.rows,
    bulkCount: 1,
    afterCount: batch.rows,
    beforeShapes: ["record"],
    afterShapes: ["record"],
    beforeAllBeforeBulk: true,
    afterAllAfterBulk: true,
    boundary: batch.boundary,
  }));
  check(`normal.${phase}.record-bulk-order`, "order", expectedOrder, observed);
}

function summaryChains(trace, phase) {
  const tokens = trace
    .filter((entry) => entry.phase === phase)
    .filter((entry) =>
      entry.source === "engine" && entry.event === "aggregate"
      || entry.source === "hook" && ["beforeUpdate", "afterUpdate"].includes(entry.event)
      || entry.source === "driver" && entry.event === "update",
    )
    .map((entry) => `${entry.source}.${entry.event}`);
  return tokens;
}
const summaryChain = [
  "engine.aggregate",
  "hook.beforeUpdate",
  "driver.update",
  "hook.afterUpdate",
];
check(
  "normal.single-parent.summary-order",
  "order",
  Array.from({ length: 5 }, () => summaryChain).flat(),
  summaryChains(actual.normal.trace, "single-parent"),
);
check(
  "normal.ten-parents.summary-order",
  "order",
  Array.from({ length: 50 }, () => summaryChain).flat(),
  summaryChains(actual.normal.trace, "ten-parents"),
);

const beforeExpected = expected.beforeInsertError;
const beforeActual = actual.beforeInsertError;
for (const [suffix, expectedValue, actualValue, category] of [
  ["before.calls", beforeExpected.beforeInsertCalls, beforeActual.beforeInsertCalls, "hook"],
  ["after.calls", beforeExpected.afterInsertCalls, beforeActual.afterInsertCalls, "hook"],
  ["before.keys", beforeExpected.beforeCallKeys, beforeActual.beforeKeys, "hook"],
  ["after.keys", beforeExpected.afterCallKeys, beforeActual.afterKeys, "hook"],
  ["engine-insert", beforeExpected.engineInsertCalls, beforeActual.engineInsertCalls, "write"],
  ["driver-bulk-create", beforeExpected.driverBulkCreateCalls, beforeActual.driverBulkCreateCalls, "write"],
  ["driver-create-attempts", beforeExpected.driverCreateAttempts, beforeActual.driverCreateAttempts, "write"],
  ["reported-inserted", beforeExpected.reportedInserted, beforeActual.reportedInserted, "exception"],
  ["reported-errored", beforeExpected.reportedErrored, beforeActual.reportedErrored, "exception"],
  ["db.rows", beforeExpected.persistedRows, beforeActual.database.items.row_count, "database"],
  ["db.hook-markers", beforeExpected.persistedHookMarkers, beforeActual.database.items.hook_markers, "database"],
  ["db.rejected-row-persisted", beforeExpected.rejectedRowPersisted, beforeActual.database.rejectedRows.length > 0, "database"],
  ["sqlite.integrity", beforeExpected.sqliteIntegrity, integrityValue(beforeActual.database), "database"],
]) {
  check(`before-error.${suffix}`, category, expectedValue, actualValue);
}

const afterExpected = expected.afterInsertErrorObservation;
const afterActual = actual.afterInsertErrorObservation;
const predicted = afterExpected.predictedTargetMechanics;
for (const [suffix, expectedValue, actualValue] of [
  ["before.calls", predicted.beforeInsertCalls, afterActual.beforeInsertCalls],
  ["after.calls", predicted.afterInsertCalls, afterActual.afterInsertCalls],
  ["engine-insert", predicted.engineInsertCalls, afterActual.engineInsertCalls],
  ["driver-bulk-create", predicted.driverBulkCreateCalls, afterActual.driverBulkCreateCalls],
  ["driver-create-attempts", predicted.driverCreateAttempts, afterActual.driverCreateAttempts],
  ["driver-create-successes", predicted.driverCreateSuccesses, afterActual.driverCreateSuccesses],
  ["reported-inserted", predicted.reportedInserted, afterActual.reportedInserted],
  ["reported-errored", predicted.reportedErrored, afterActual.reportedErrored],
  ["db.rows", predicted.persistedRows, afterActual.database.items.row_count],
]) {
  check(`after-error.observed.${suffix}`, "observation", expectedValue, actualValue);
}
const afterResultErrors = afterActual.loaderResult?.results?.[0]?.errors ?? [];
const inputKeys = ["HOOK-AFTER-01", "HOOK-AFTER-02", "HOOK-AFTER-03", "HOOK-AFTER-04", "HOOK-AFTER-05"];
const erroredKeys = afterResultErrors
  .map((error) => inputKeys[error.recordIndex])
  .filter(Boolean);
const persistedKeys = new Set(afterActual.database.persistedRows.map((row) => row.external_key));
const safety = {
  reportedInsertedEqualsPersistedRows:
    afterActual.reportedInserted === afterActual.database.items.row_count,
  reportedErroredRowsAreAbsent:
    erroredKeys.every((key) => !persistedKeys.has(key)),
};
check(
  "after-error.safety.reported-inserted-equals-persisted",
  "exception",
  afterExpected.safetyInvariants.reportedInsertedEqualsPersistedRows,
  safety.reportedInsertedEqualsPersistedRows,
);
check(
  "after-error.safety.reported-errored-rows-absent",
  "exception",
  afterExpected.safetyInvariants.reportedErroredRowsAreAbsent,
  safety.reportedErroredRowsAreAbsent,
);
check("after-error.sqlite.integrity", "database", afterExpected.sqliteIntegrity, integrityValue(afterActual.database));
check("after-error.sqlite.duplicate-keys", "database", [], afterActual.database.duplicateKeys);

const categorySummary = Object.fromEntries(
  [...new Set(checks.map((item) => item.category))].sort().map((category) => {
    const categoryChecks = checks.filter((item) => item.category === category);
    return [category, {
      total: categoryChecks.length,
      passed: categoryChecks.filter((item) => item.pass).length,
      failed: categoryChecks.filter((item) => !item.pass).length,
    }];
  }),
);
const failed = checks.filter((item) => !item.pass);
const knownIssue2922Detected =
  actual.normal.seed.beforeInsertCalls === 5
  && actual.normal.seed.database.row_count === 1000
  && actual.normal.seed.database.hook_markers === 0
  && actual.beforeInsertError.reportedErrored === 0;
const afterInsertPersistenceMismatchObserved =
  !safety.reportedInsertedEqualsPersistedRows
  && !safety.reportedErroredRowsAreAbsent;
const report = {
  schemaVersion: 1,
  status: failed.length === 0 ? "pass" : "fail",
  totalChecks: checks.length,
  passedChecks: checks.length - failed.length,
  failedChecks: failed.length,
  categorySummary,
  knownIssue2922Detected,
  afterInsertPersistenceMismatchObserved,
  safety,
  checks,
};
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);

const markdownPath = outputPath.replace(/\.json$/, ".md");
const lines = [
  "# Hook QA comparison report",
  "",
  `- Status: **${report.status.toUpperCase()}**`,
  `- Checks: ${report.passedChecks}/${report.totalChecks} passed; ${report.failedChecks} failed`,
  `- Known record-Hook issue #2922 reproduced: ${knownIssue2922Detected}`,
  `- afterInsert persistence/report mismatch observed: ${afterInsertPersistenceMismatchObserved}`,
  "",
  "## Category summary",
  "",
  "| Category | Passed | Failed | Total |",
  "|---|---:|---:|---:|",
  ...Object.entries(categorySummary).map(([category, value]) =>
    `| ${category} | ${value.passed} | ${value.failed} | ${value.total} |`),
  "",
  "## Failed checks",
  "",
  "| ID | Category | Expected | Actual |",
  "|---|---|---|---|",
  ...failed.map((item) =>
    `| ${item.id} | ${item.category} | \`${JSON.stringify(item.expected)}\` | \`${JSON.stringify(item.actual)}\` |`),
];
fs.writeFileSync(markdownPath, `${lines.join("\n")}\n`);
console.log(JSON.stringify({
  status: report.status,
  checks: report.totalChecks,
  failed: report.failedChecks,
  output: path.basename(outputPath),
  markdown: path.basename(markdownPath),
}, null, 2));
process.exit(failed.length === 0 ? 0 : 2);
