import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { objectDefinitions } from "./object-definitions.ts";

const fixedSha = "98874656ffc50ce1531af52346228ffcdda73fba";
const args = new Map<string, string>();
for (let index = 2; index < process.argv.length; index += 2) {
  args.set(process.argv[index], process.argv[index + 1]);
}

const frameworkRoot = path.resolve(args.get("--framework-root") ?? "");
const dataDir = path.resolve(args.get("--data-dir") ?? "");
const databasePath = path.resolve(args.get("--database") ?? "");
const outputPath = path.resolve(args.get("--output") ?? "");
if (![frameworkRoot, dataDir, databasePath, outputPath].every(Boolean)) {
  throw new Error("Missing --framework-root, --data-dir, --database, or --output");
}

function parseCsv(text: string): Array<Record<string, string>> {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted && char === '"' && text[index + 1] === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  const [headers, ...values] = rows;
  return values.map((valuesRow) => Object.fromEntries(
    headers.map((header, index) => [header, valuesRow[index] ?? ""]),
  ));
}

const readCsv = async (name: string) => parseCsv(
  await fs.readFile(path.join(dataDir, name), "utf8"),
);
const sourceUrl = (relativePath: string) => pathToFileURL(
  path.join(frameworkRoot, relativePath),
).href;

const [objectqlModule, sqlModule, seedModule, protocolModule, restModule] = await Promise.all([
  import(sourceUrl("packages/objectql/src/engine.ts")),
  import(sourceUrl("packages/plugins/driver-sql/src/index.ts")),
  import(sourceUrl("packages/metadata-protocol/src/seed-loader.ts")),
  import(sourceUrl("packages/metadata-protocol/src/protocol.ts")),
  import(sourceUrl("packages/rest/src/rest-server.ts")),
]);
const { ObjectQL } = objectqlModule;
const { SqlDriver } = sqlModule;
const { SeedLoaderService } = seedModule;
const { ObjectStackProtocolImplementation } = protocolModule;
const { RestServer } = restModule;

const logEvents: Array<Record<string, unknown>> = [];
const log = (level: string, message: unknown, meta?: unknown) => {
  const event = { at: new Date().toISOString(), level, message: String(message), meta };
  logEvents.push(event);
  console.log(JSON.stringify(event));
};
const logger = {
  info: (message: unknown, meta?: unknown) => log("info", message, meta),
  warn: (message: unknown, meta?: unknown) => log("warn", message, meta),
  error: (message: unknown, error?: unknown, meta?: unknown) =>
    log("error", message, { error: String((error as Error)?.message ?? error), meta }),
  debug: (message: unknown, meta?: unknown) => log("debug", message, meta),
};

function createMockServer() {
  const noop = () => undefined;
  return {
    get: noop,
    post: noop,
    put: noop,
    delete: noop,
    patch: noop,
    use: noop,
    listen: async () => undefined,
    close: async () => undefined,
  };
}

function makeResponse() {
  const response: any = {
    write: () => true,
    end: () => undefined,
    header: () => response,
    status: (code: number) => { response.statusCode = code; return response; },
    json: (body: unknown) => { response.body = body; return response; },
  };
  return response;
}

const actualSha = execFileSync(
  "git",
  ["-C", frameworkRoot, "rev-parse", "HEAD"],
  { encoding: "utf8" },
).trim();
if (actualSha !== fixedSha) {
  throw new Error(`Framework SHA mismatch: expected ${fixedSha}, got ${actualSha}`);
}
try {
  await fs.access(databasePath);
  throw new Error(`Refusing to overwrite existing database: ${databasePath}`);
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}
await fs.mkdir(path.dirname(databasePath), { recursive: true });

const driver = new SqlDriver({
  client: "better-sqlite3",
  connection: { filename: databasePath },
  useNullAsDefault: true,
  pool: { min: 1, max: 1 },
});
const engine = new ObjectQL({ logger });
engine.registerDriver(driver, true);
for (const definition of objectDefinitions) {
  engine.registerObject(structuredClone(definition) as any, "issue-2678-revalidation");
}
await engine.init();
await driver.initObjects(objectDefinitions.map((definition) => structuredClone(definition)) as any);

type Phase = "setup" | "seed" | "import" | "single-parent" | "ten-parents" | "audit";
let phase: Phase = "setup";
const wrapperCalls = {
  engineInsert: [] as Array<{ phase: Phase; object: string; rows: number }>,
  protocolCreateMany: [] as Array<{ phase: Phase; object: string; rows: number }>,
  protocolCreateOne: [] as Array<{ phase: Phase; object: string }>,
  summaryAggregate: [] as Array<{ phase: Phase; parentId: string | null }>,
  summaryParentUpdate: [] as Array<{ phase: Phase; parentId: string; value: number | null }>,
};

const originalInsert = engine.insert.bind(engine);
(engine as any).insert = async (object: string, data: unknown, options?: unknown) => {
  wrapperCalls.engineInsert.push({ phase, object, rows: Array.isArray(data) ? data.length : 1 });
  return originalInsert(object, data as any, options as any);
};
const originalAggregate = engine.aggregate.bind(engine);
(engine as any).aggregate = async (object: string, query: any, options?: unknown) => {
  if (object === "qa_summary_child" && ["single-parent", "ten-parents"].includes(phase)) {
    wrapperCalls.summaryAggregate.push({ phase, parentId: query?.where?.parent_id ?? null });
  }
  return originalAggregate(object, query, options as any);
};
const originalUpdate = engine.update.bind(engine);
(engine as any).update = async (object: string, data: any, options?: unknown) => {
  if (object === "qa_summary_parent" && ["single-parent", "ten-parents"].includes(phase)) {
    wrapperCalls.summaryParentUpdate.push({
      phase,
      parentId: String(data?.id ?? ""),
      value: data?.total_amount == null ? null : Number(data.total_amount),
    });
  }
  return originalUpdate(object, data, options as any);
};

const protocol = new ObjectStackProtocolImplementation(engine as any);
const originalCreateMany = protocol.createManyData.bind(protocol);
(protocol as any).createManyData = async (request: any) => {
  wrapperCalls.protocolCreateMany.push({
    phase,
    object: request.object,
    rows: request.records.length,
  });
  return originalCreateMany(request);
};
const originalCreateOne = protocol.createData.bind(protocol);
(protocol as any).createData = async (request: any) => {
  wrapperCalls.protocolCreateOne.push({ phase, object: request.object });
  return originalCreateOne(request);
};

const metadata = {
  getObject: async (name: string) => engine.registry.getObject(name),
};
const seedLoader = new SeedLoaderService(engine as any, metadata as any, logger as any);
const seedConfig = {
  dryRun: false,
  haltOnError: false,
  multiPass: true,
  defaultMode: "insert",
  batchSize: 200,
  transaction: false,
};

const seedRows = (await readCsv("qa_seed_item.csv")).map((row) => ({
  external_key: row.external_key,
  name: row.name,
  amount: Number(row.amount),
  active: row.active === "true",
}));
const importCsv = await fs.readFile(path.join(dataDir, "qa_import_item.csv"), "utf8");
const parentRows = await readCsv("qa_summary_parents.csv");
const singleRows = (await readCsv("qa_summary_child_single_parent.csv")).map((row) => ({
  external_key: row.external_key,
  name: row.name,
  parent_id: row.parent_id,
  amount: Number(row.amount),
}));
const tenRows = (await readCsv("qa_summary_child_ten_parents.csv")).map((row) => ({
  external_key: row.external_key,
  name: row.name,
  parent_id: row.parent_id,
  amount: Number(row.amount),
}));

const startedAt = new Date().toISOString();
phase = "seed";
const seedResult = await seedLoader.load({
  seeds: [{
    object: "qa_seed_item",
    mode: "insert",
    externalId: "external_key",
    records: seedRows,
  }],
  config: seedConfig,
} as any);

const rest = new RestServer(
  createMockServer() as any,
  protocol as any,
  { api: { requireAuth: false } } as any,
);
rest.registerRoutes();
const importRoute = rest.getRoutes().find(
  (route: any) => route.method === "POST" && route.path === "/api/v1/data/:object/import",
);
if (!importRoute) throw new Error("Real import route was not registered");
phase = "import";
const importResponse = makeResponse();
await importRoute.handler({
  params: { object: "qa_import_item" },
  body: {
    format: "csv",
    csv: importCsv,
    mapping: {
      external_key: "external_key",
      name: "name",
      amount: "amount",
      active: "active",
    },
    writeMode: "insert",
  },
} as any, importResponse);

phase = "setup";
await engine.insert("qa_summary_parent", parentRows.map((row) => ({
  id: row.id,
  name: row.name,
})) as any);

phase = "single-parent";
const singleParentResult = await seedLoader.load({
  seeds: [{
    object: "qa_summary_child",
    mode: "insert",
    externalId: "external_key",
    records: singleRows,
  }],
  config: seedConfig,
} as any);

phase = "ten-parents";
const tenParentResult = await seedLoader.load({
  seeds: [{
    object: "qa_summary_child",
    mode: "insert",
    externalId: "external_key",
    records: tenRows,
  }],
  config: seedConfig,
} as any);

phase = "audit";
const knex = (driver as any).knex;

const itemAudit = async (table: string) => {
  const rows = await knex.raw(`
    SELECT
      COUNT(*) AS row_count,
      COUNT(DISTINCT external_key) AS unique_external_keys,
      MIN(amount) AS min_amount,
      MAX(amount) AS max_amount,
      SUM(amount) AS amount_sum,
      SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END) AS active_true
    FROM ${table}
  `);
  const row = Array.isArray(rows) ? rows[0] : rows;
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, Number(value)]));
};

const childAuditRows = await knex.raw(`
  SELECT
    parent_id,
    COUNT(*) AS row_count,
    COUNT(DISTINCT external_key) AS unique_external_keys,
    MIN(amount) AS min_amount,
    MAX(amount) AS max_amount,
    SUM(amount) AS amount_sum
  FROM qa_summary_child
  GROUP BY parent_id
  ORDER BY parent_id
`);
const parentAuditRows = await knex.raw(`
  SELECT id, name, total_amount
  FROM qa_summary_parent
  ORDER BY id
`);
const orphanRows = await knex.raw(`
  SELECT COUNT(*) AS orphan_count
  FROM qa_summary_child AS child
  LEFT JOIN qa_summary_parent AS parent ON parent.id = child.parent_id
  WHERE parent.id IS NULL
`);
const integrityRows = await knex.raw("PRAGMA integrity_check");

const normalizeNumericRows = (rows: any[]) => rows.map((row) => Object.fromEntries(
  Object.entries(row).map(([key, value]) => [
    key,
    ["row_count", "unique_external_keys", "min_amount", "max_amount", "amount_sum", "total_amount"].includes(key)
      ? Number(value)
      : value,
  ]),
));
const seedCalls = wrapperCalls.engineInsert.filter(
  (call) => call.phase === "seed" && call.object === "qa_seed_item",
);
const singleInsertCalls = wrapperCalls.engineInsert.filter(
  (call) => call.phase === "single-parent" && call.object === "qa_summary_child",
);
const tenInsertCalls = wrapperCalls.engineInsert.filter(
  (call) => call.phase === "ten-parents" && call.object === "qa_summary_child",
);
const importBatchCalls = wrapperCalls.protocolCreateMany.filter(
  (call) => call.phase === "import" && call.object === "qa_import_item",
);
const importSingleCalls = wrapperCalls.protocolCreateOne.filter(
  (call) => call.phase === "import" && call.object === "qa_import_item",
);

const rawResults = {
  schemaVersion: 1,
  provenance: "Data source reconstructed from the final report and revalidated; the original temporary fixture no longer exists.",
  startedAt,
  finishedAt: new Date().toISOString(),
  framework: { requestedSha: fixedSha, actualSha },
  parameters: {
    scope: "framework issue #2678 problem one only",
    database: "SQLite via better-sqlite3 and @objectstack/driver-sql",
    rowsPerScenario: 1000,
    batchSize: 200,
    writeMode: "insert",
    seedConfig,
  },
  sourceInputs: [
    "data/qa_seed_item.csv",
    "data/qa_import_item.csv",
    "data/qa_summary_parents.csv",
    "data/qa_summary_child_single_parent.csv",
    "data/qa_summary_child_ten_parents.csv",
  ],
  seed: {
    loaderResult: seedResult,
    observedInsertCalls: seedCalls,
    batchCalls: seedCalls.filter((call) => call.rows > 1).length,
    singleCalls: seedCalls.filter((call) => call.rows === 1).length,
    databaseAudit: await itemAudit("qa_seed_item"),
  },
  import: {
    httpStatus: importResponse.statusCode ?? 200,
    routeResponse: importResponse.body,
    observedCreateManyCalls: importBatchCalls,
    observedCreateOneCalls: importSingleCalls,
    databaseAudit: await itemAudit("qa_import_item"),
  },
  summaries: {
    singleParent: {
      loaderResult: singleParentResult,
      observedInsertCalls: singleInsertCalls,
      observedAggregateCalls: wrapperCalls.summaryAggregate.filter(
        (call) => call.phase === "single-parent",
      ),
      observedParentUpdates: wrapperCalls.summaryParentUpdate.filter(
        (call) => call.phase === "single-parent",
      ),
    },
    tenParents: {
      loaderResult: tenParentResult,
      observedInsertCalls: tenInsertCalls,
      observedAggregateCalls: wrapperCalls.summaryAggregate.filter(
        (call) => call.phase === "ten-parents",
      ),
      observedParentUpdates: wrapperCalls.summaryParentUpdate.filter(
        (call) => call.phase === "ten-parents",
      ),
    },
    childDatabaseAudit: normalizeNumericRows(childAuditRows),
    parentDatabaseAudit: normalizeNumericRows(parentAuditRows),
    orphanCount: Number(orphanRows[0]?.orphan_count ?? -1),
  },
  sqlite: { integrityCheck: integrityRows },
  wrapperMethod: "Wrappers recorded arguments and delegated every call to the original product implementation without altering inputs, outputs, or behavior.",
  wrapperCalls,
  logs: logEvents,
};

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, JSON.stringify(rawResults, null, 2) + "\n");
await engine.destroy();
console.log(JSON.stringify({
  result: "raw-results-written",
  output: path.basename(outputPath),
  database: path.basename(databasePath),
  seedBatchCalls: rawResults.seed.batchCalls,
  importBatchCalls: importBatchCalls.length,
  singleParentRecomputes: rawResults.summaries.singleParent.observedAggregateCalls.length,
  tenParentRecomputes: rawResults.summaries.tenParents.observedAggregateCalls.length,
  sqliteIntegrity: integrityRows,
}, null, 2));
