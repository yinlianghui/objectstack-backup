import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) {
  args.set(process.argv[i], process.argv[i + 1]);
}

const scriptDir = path.dirname(new URL(import.meta.url).pathname);
const taskRoot = path.resolve(scriptDir, "..");
const outputDir = path.resolve(args.get("--output-dir") ?? path.join(taskRoot, "data"));
const renderDir = path.resolve(args.get("--render-dir") ?? path.join(taskRoot, "rendered"));
const fixedSha = "98874656ffc50ce1531af52346228ffcdda73fba";
const rowCount = 1000;
const batchSize = 200;

const pad = (value, width = 4) => String(value).padStart(width, "0");
const quoteCsv = (value) => {
  if (typeof value === "boolean") return value ? "true" : "false";
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

function toCsv(rows, columns) {
  return [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => quoteCsv(row[column])).join(",")),
  ].join("\n") + "\n";
}

function makeItemRows(prefix, label, activeWhenEven) {
  return Array.from({ length: rowCount }, (_, index) => {
    const amount = index + 1;
    return {
      external_key: `${prefix}-${pad(amount)}`,
      name: `${label} ${pad(amount)}`,
      amount,
      active: activeWhenEven ? amount % 2 === 0 : amount % 2 === 1,
    };
  });
}

function makeSummaryRows(prefix, label, parentForRow) {
  return Array.from({ length: rowCount }, (_, index) => {
    const amount = index + 1;
    return {
      external_key: `${prefix}-${pad(amount)}`,
      name: `${label} ${pad(amount)}`,
      parent_id: parentForRow(amount),
      amount,
    };
  });
}

const seedRows = makeItemRows("SEED", "Seed Item", false);
const importRows = makeItemRows("IMPORT", "Import Item", true);
const singleParentRows = makeSummaryRows(
  "SINGLE",
  "Single Parent Child",
  () => "parent_single",
);
const tenParentRows = makeSummaryRows(
  "TEN",
  "Ten Parent Child",
  (amount) => `parent_${pad(((amount - 1) % 10) + 1, 2)}`,
);

const singleParent = {
  id: "parent_single",
  name: "parent_single",
  expected_child_count: rowCount,
  expected_total_amount: 500500,
};
const tenParents = Array.from({ length: 10 }, (_, index) => {
  const parentNumber = index + 1;
  return {
    id: `parent_${pad(parentNumber, 2)}`,
    name: `parent_${pad(parentNumber, 2)}`,
    expected_child_count: 100,
    expected_total_amount: 49500 + parentNumber * 100,
  };
});
const parentRows = [singleParent, ...tenParents];

const expected = {
  provenance: "Data source reconstructed from the final report and revalidated; the original temporary fixture no longer exists.",
  frameworkSha: fixedSha,
  batchSize,
  datasets: {
    qa_seed_item: {
      file: "qa_seed_item.csv", rowCount, uniqueKeyCount: rowCount,
      amountMin: 1, amountMax: rowCount, amountSum: 500500,
      activeTrue: 500, activeFalse: 500,
      batchWrites: 5, singleWrites: 0,
    },
    qa_import_item: {
      file: "qa_import_item.csv", rowCount, uniqueKeyCount: rowCount,
      amountMin: 1, amountMax: rowCount, amountSum: 500500,
      activeTrue: 500, activeFalse: 500,
      batches: 5,
    },
  },
  summary: {
    singleParent: {
      file: "qa_summary_child_single_parent.csv", rowCount,
      parentCount: 1, expectedRecomputeCalls: 5, amountSum: 500500,
      parents: [singleParent],
    },
    tenParents: {
      file: "qa_summary_child_ten_parents.csv", rowCount,
      parentCount: 10, expectedRecomputeCalls: 50, amountSum: 500500,
      parents: tenParents,
    },
  },
};

await fs.mkdir(outputDir, { recursive: true });
await fs.mkdir(renderDir, { recursive: true });

const files = [
  ["qa_seed_item.csv", seedRows, ["external_key", "name", "amount", "active"]],
  ["qa_import_item.csv", importRows, ["external_key", "name", "amount", "active"]],
  ["qa_summary_parents.csv", parentRows, ["id", "name", "expected_child_count", "expected_total_amount"]],
  ["qa_summary_child_single_parent.csv", singleParentRows, ["external_key", "name", "parent_id", "amount"]],
  ["qa_summary_child_ten_parents.csv", tenParentRows, ["external_key", "name", "parent_id", "amount"]],
];
for (const [fileName, rows, columns] of files) {
  await fs.writeFile(path.join(outputDir, fileName), toCsv(rows, columns), "utf8");
}
await fs.writeFile(
  path.join(outputDir, "expected-results.json"),
  JSON.stringify(expected, null, 2) + "\n",
  "utf8",
);

const workbook = Workbook.create();
const colors = {
  navy: "#16324F",
  teal: "#1F7A8C",
  pale: "#E8F1F5",
  ink: "#1F2937",
  green: "#DFF3E4",
};

function styleTitle(sheet, range, title) {
  const titleRange = sheet.getRange(range);
  titleRange.merge();
  titleRange.values = [[title]];
  titleRange.format = {
    fill: colors.navy,
    font: { bold: true, color: "#FFFFFF", size: 16 },
    verticalAlignment: "center",
  };
  titleRange.format.rowHeight = 28;
}

function styleHeader(range) {
  range.format = {
    fill: colors.teal,
    font: { bold: true, color: "#FFFFFF" },
    borders: { preset: "outside", style: "thin", color: "#B8C4CE" },
    verticalAlignment: "center",
  };
  range.format.rowHeight = 22;
}

function setColumnWidths(sheet, widths) {
  widths.forEach((width, index) => {
    sheet.getRangeByIndexes(0, index, 1, 1).format.columnWidth = width;
  });
}

function addDataSheet(name, title, note, rows, columns, widths, numericColumn) {
  const sheet = workbook.worksheets.add(name);
  sheet.showGridLines = false;
  styleTitle(sheet, `A1:${String.fromCharCode(64 + columns.length)}1`, title);
  sheet.getRange(`A2:${String.fromCharCode(64 + columns.length)}2`).merge();
  sheet.getRange("A2").values = [[note]];
  sheet.getRange("A2").format = { fill: colors.pale, font: { color: colors.ink } };
  sheet.getRangeByIndexes(2, 0, 1, columns.length).values = [columns];
  styleHeader(sheet.getRangeByIndexes(2, 0, 1, columns.length));
  sheet.getRangeByIndexes(3, 0, rows.length, columns.length).values = rows.map(
    (row) => columns.map((column) => row[column]),
  );
  sheet.getRangeByIndexes(3, 0, rows.length, columns.length).format = {
    font: { color: colors.ink },
  };
  sheet.getRangeByIndexes(3, numericColumn, rows.length, 1).format.numberFormat = "#,##0";
  sheet.freezePanes.freezeRows(3);
  setColumnWidths(sheet, widths);
  return sheet;
}

const readme = workbook.worksheets.add("README");
readme.showGridLines = false;
styleTitle(readme, "A1:D1", "Issue #2678 Reconstructed Data Source");
readme.getRange("A3:B10").values = [
  ["Purpose", "Human-readable view of the exact CSV rows used for revalidation"],
  ["Provenance", expected.provenance],
  ["Framework SHA", fixedSha],
  ["Rows per main dataset", rowCount],
  ["Batch size", batchSize],
  ["Amount domain", "1 through 1,000"],
  ["Total amount", 500500],
  ["Generated by", "source/generate-fixtures.mjs"],
];
styleHeader(readme.getRange("A3:A10"));
readme.getRange("B6:B9").format.numberFormat = "#,##0";
readme.getRange("A12:D14").merge();
readme.getRange("A12").values = [[
  "The original temporary fixture was deleted. This workbook and its CSV companions were reconstructed deterministically from the final report and then revalidated against real SQLite.",
]];
readme.getRange("A12:D14").format = { fill: colors.pale, wrapText: true, verticalAlignment: "center" };
setColumnWidths(readme, [24, 70, 14, 14]);

addDataSheet("Seed Data", "qa_seed_item — 1,000 rows", "Exact Seed input CSV", seedRows,
  ["external_key", "name", "amount", "active"], [20, 28, 14, 12], 2);
addDataSheet("Import Data", "qa_import_item — 1,000 rows", "Exact Import input CSV", importRows,
  ["external_key", "name", "amount", "active"], [20, 28, 14, 12], 2);

addDataSheet(
  "Summary Parents",
  "qa_summary_parent — deterministic parent setup",
  "The harness inserts id/name; expected columns are independent audit targets",
  parentRows,
  ["id", "name", "expected_child_count", "expected_total_amount"],
  [20, 20, 22, 24],
  2,
);
workbook.worksheets.getItem("Summary Parents").getRange("D4:D14").format.numberFormat = "#,##0";

addDataSheet(
  "Single Parent",
  "qa_summary_child — single-parent scenario",
  "1,000 children point to parent_single; exact Seed input CSV",
  singleParentRows,
  ["external_key", "name", "parent_id", "amount"],
  [20, 30, 20, 14],
  3,
);
addDataSheet(
  "Ten Parents",
  "qa_summary_child — ten-parent scenario",
  "Rows are assigned round-robin; each parent receives 100 children",
  tenParentRows,
  ["external_key", "name", "parent_id", "amount"],
  [20, 30, 20, 14],
  3,
);

const resultsSheet = workbook.worksheets.add("Expected Results");
resultsSheet.showGridLines = false;
styleTitle(resultsSheet, "A1:G1", "Expected Results and Formula Checks");
resultsSheet.getRange("A3:E3").values = [["Metric", "Expected", "Calculated", "Status", "Source"]];
styleHeader(resultsSheet.getRange("A3:E3"));
resultsSheet.getRange("A4:B13").values = [
  ["Seed row count", 1000], ["Seed amount sum", 500500], ["Seed active=true", 500],
  ["Import row count", 1000], ["Import amount sum", 500500], ["Import active=true", 500],
  ["Single-parent row count", 1000], ["Single-parent amount sum", 500500],
  ["Ten-parent row count", 1000], ["Ten-parent amount sum", 500500],
];
resultsSheet.getRange("C4:C13").formulas = [
  ["=COUNTA('Seed Data'!A4:A1003)"], ["=SUM('Seed Data'!C4:C1003)"], ["=COUNTIF('Seed Data'!D4:D1003,1)"],
  ["=COUNTA('Import Data'!A4:A1003)"], ["=SUM('Import Data'!C4:C1003)"], ["=COUNTIF('Import Data'!D4:D1003,1)"],
  ["=COUNTA('Single Parent'!A4:A1003)"], ["=SUM('Single Parent'!D4:D1003)"],
  ["=COUNTA('Ten Parents'!A4:A1003)"], ["=SUM('Ten Parents'!D4:D1003)"],
];
resultsSheet.getRange("D4").formulas = [["=IF(B4=C4,\"PASS\",\"FAIL\")"]];
resultsSheet.getRange("D4:D13").fillDown();
resultsSheet.getRange("E4:E13").values = [
  ["Seed Data"], ["Seed Data"], ["Seed Data"], ["Import Data"], ["Import Data"],
  ["Import Data"], ["Single Parent"], ["Single Parent"], ["Ten Parents"], ["Ten Parents"],
];

resultsSheet.getRange("A16:G16").values = [[
  "Parent", "Expected rows", "Expected amount", "Calculated rows", "Calculated amount", "Rows status", "Amount status",
]];
styleHeader(resultsSheet.getRange("A16:G16"));
resultsSheet.getRange("A17:C26").values = tenParents.map((parent) => [
  parent.id, parent.expected_child_count, parent.expected_total_amount,
]);
resultsSheet.getRange("D17:D26").formulas = tenParents.map((_, index) => [
  `=COUNTIF('Ten Parents'!$C$4:$C$1003,A${17 + index})`,
]);
resultsSheet.getRange("E17:E26").formulas = tenParents.map((_, index) => [
  `=SUMIF('Ten Parents'!$C$4:$C$1003,A${17 + index},'Ten Parents'!$D$4:$D$1003)`,
]);
resultsSheet.getRange("F17:F26").formulas = tenParents.map((_, index) => [
  `=IF(B${17 + index}=D${17 + index},\"PASS\",\"FAIL\")`,
]);
resultsSheet.getRange("G17:G26").formulas = tenParents.map((_, index) => [
  `=IF(C${17 + index}=E${17 + index},\"PASS\",\"FAIL\")`,
]);
resultsSheet.getRange("B4:C13").format.numberFormat = "#,##0";
resultsSheet.getRange("B17:E26").format.numberFormat = "#,##0";
resultsSheet.getRange("D4:D13").format = { fill: colors.green, font: { bold: true, color: "#176B37" } };
resultsSheet.getRange("F17:G26").format = { fill: colors.green, font: { bold: true, color: "#176B37" } };
resultsSheet.freezePanes.freezeRows(3);
setColumnWidths(resultsSheet, [28, 18, 20, 20, 22, 16, 18]);

const inspections = [];
for (const range of [
  "README!A1:D14", "Seed Data!A1:D8", "Seed Data!A999:D1003",
  "Import Data!A1:D8", "Import Data!A999:D1003", "Summary Parents!A1:D14",
  "Single Parent!A1:D8", "Single Parent!A999:D1003",
  "Ten Parents!A1:D8", "Ten Parents!A999:D1003", "Expected Results!A1:G26",
]) {
  const inspected = await workbook.inspect({
    kind: "table", range, include: "values,formulas",
    tableMaxRows: 30, tableMaxCols: 8, maxChars: 12000,
  });
  inspections.push({ range, ndjson: inspected.ndjson });
}
const formulaErrors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 300 },
  summary: "final formula error scan",
});
await fs.writeFile(path.join(outputDir, "workbook-inspection.json"), JSON.stringify(inspections, null, 2) + "\n");
await fs.writeFile(path.join(outputDir, "workbook-formula-error-scan.ndjson"), formulaErrors.ndjson + "\n");

const renderRanges = {
  "README": "A1:D14",
  "Seed Data": "A1:D28",
  "Import Data": "A1:D28",
  "Summary Parents": "A1:D14",
  "Single Parent": "A1:D28",
  "Ten Parents": "A1:D28",
  "Expected Results": "A1:G26",
};
const renderManifest = [];
for (const [sheetName, range] of Object.entries(renderRanges)) {
  const rendered = await workbook.render({ sheetName, range, scale: 1.2, format: "png" });
  const fileName = `${sheetName.toLowerCase().replaceAll(" ", "-")}.png`;
  const bytes = new Uint8Array(await rendered.arrayBuffer());
  await fs.writeFile(path.join(renderDir, fileName), bytes);
  renderManifest.push({ sheetName, range, fileName, bytes: bytes.byteLength });
}
await fs.writeFile(path.join(outputDir, "workbook-render-manifest.json"), JSON.stringify(renderManifest, null, 2) + "\n");

const workbookPath = path.join(outputDir, "issue-2678-reconstructed-data-source.xlsx");
const exported = await SpreadsheetFile.exportXlsx(workbook);
await exported.save(workbookPath);

console.log(JSON.stringify({
  provenance: expected.provenance,
  outputDir,
  workbookPath,
  csvFiles: files.map(([fileName]) => fileName),
  renderedSheets: renderManifest.length,
  formulaErrorScan: formulaErrors.ndjson,
}, null, 2));
