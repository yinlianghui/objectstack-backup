import { Workbook } from "@oai/artifact-tool";

const workbook = Workbook.create();
const help = workbook.help("fx.COUNTIF", {
  include: "index,examples,notes",
  maxChars: 3000,
});
console.log("HELP");
console.log(help.ndjson);

const sheet = workbook.worksheets.add("Boolean Test");
sheet.getRange("A1:A4").values = [[true], [false], [true], [false]];
sheet.getRange("B1:B6").formulas = [
  ["=COUNTIF(A1:A4,TRUE)"],
  ["=COUNTIF(A1:A4,1)"],
  ["=COUNTIF(A1:A4,\"TRUE\")"],
  ["=SUMPRODUCT(--(A1:A4=TRUE))"],
  ["=SUMPRODUCT(N(A1:A4))"],
  ["=COUNTIF(A1:A4,FALSE)"],
];
const inspected = await workbook.inspect({
  kind: "table",
  range: "Boolean Test!A1:B6",
  include: "values,formulas",
  tableMaxRows: 10,
  tableMaxCols: 3,
  maxChars: 5000,
});
console.log("INSPECT");
console.log(inspected.ndjson);
