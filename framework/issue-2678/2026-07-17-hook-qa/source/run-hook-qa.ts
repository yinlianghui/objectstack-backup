import fs from "node:fs/promises";
import path from "node:path";
import {
  FIXED_SHA,
  TraceRecorder,
  assertFrameworkSha,
  createEnvironment,
  hookDetails,
  parseArgs,
  readCsv,
  refuseExisting,
  rowDetails,
  sourceUrl,
  writeJson,
} from "./harness-utils.ts";
import {
  afterErrorObjectDefinition,
  beforeErrorObjectDefinition,
  objectDefinitions,
} from "./object-definitions.ts";

const args = parseArgs(process.argv);
const frameworkRoot = path.resolve(args.get("--framework-root") ?? "");
const dataDir = path.resolve(args.get("--data-dir") ?? "");
const databasesDir = path.resolve(args.get("--databases-dir") ?? "");
const outputPath = path.resolve(args.get("--output") ?? "");
if (![frameworkRoot, dataDir, databasesDir, outputPath].every(Boolean)) {
  throw new Error(
    "Missing --framework-root, --data-dir, --databases-dir, or --output",
  );
}

const databasePaths = {
  normal: path.join(databasesDir, "hook-normal.sqlite"),
  beforeError: path.join(databasesDir, "hook-before-error.sqlite"),
  afterError: path.join(databasesDir, "hook-after-error.sqlite"),
};
await refuseExisting([...Object.values(databasePaths), outputPath]);
const actualSha = assertFrameworkSha(frameworkRoot);

const [seedModule, protocolModule, restModule] = await Promise.all([
  import(sourceUrl(frameworkRoot, "packages/metadata-protocol/src/seed-loader.ts")),
  import(sourceUrl(frameworkRoot, "packages/metadata-protocol/src/protocol.ts")),
  import(sourceUrl(frameworkRoot, "packages/rest/src/rest-server.ts")),
]);

const seedConfig = {
  dryRun: false,
  haltOnError: false,
  multiPass: true,
  defaultMode: "insert",
  batchSize: 200,
  transaction: false,
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

function rowsFromItems(rows: Array<Record<string, string>>) {
  return rows.map((row) => ({
    external_key: row.external_key,
    name: row.name,
    amount: Number(row.amount),
    active: row.active === "true",
  }));
}

function rowsFromChildren(rows: Array<Record<string, string>>) {
  return rows.map((row) => ({
    external_key: row.external_key,
    name: row.name,
    parent_id: row.parent_id,
    amount: Number(row.amount),
  }));
}

function bindObservedHooks(engine: any, trace: TraceRecorder) {
  const insertObjects = ["qa_seed_item", "qa_import_item", "qa_summary_child"];
  const packageId = "issue-2678-hook-qa";
  engine.bindHooks([
    {
      name: "qa_before_insert_observer",
      object: insertObjects,
      events: ["beforeInsert"],
      priority: 100,
      onError: "abort",
      handler: async (context: any) => {
        trace.push("hook", "beforeInsert", hookDetails(context, context.input?.data));
        const externalKey = context.input.external_key;
        context.input.hook_marker = `hooked:${externalKey}`;
      },
    },
    {
      name: "qa_after_insert_observer",
      object: insertObjects,
      events: ["afterInsert"],
      priority: 100,
      onError: "abort",
      handler: async (context: any) => {
        trace.push("hook", "afterInsert", hookDetails(context, context.result));
      },
    },
    {
      name: "qa_parent_before_update_observer",
      object: "qa_summary_parent",
      events: ["beforeUpdate"],
      priority: 100,
      onError: "abort",
      handler: async (context: any) => {
        trace.push("hook", "beforeUpdate", {
          object: context.object,
          id: context.input?.data?.id ?? null,
          total: context.input?.data?.total_amount == null
            ? null
            : Number(context.input.data.total_amount),
          previousTotal: context.previous?.total_amount == null
            ? null
            : Number(context.previous.total_amount),
        });
      },
    },
    {
      name: "qa_parent_after_update_observer",
      object: "qa_summary_parent",
      events: ["afterUpdate"],
      priority: 100,
      onError: "abort",
      handler: async (context: any) => {
        trace.push("hook", "afterUpdate", {
          object: context.object,
          id: context.result?.id ?? context.input?.data?.id ?? null,
          total: context.result?.total_amount == null
            ? null
            : Number(context.result.total_amount),
          previousTotal: context.previous?.total_amount == null
            ? null
            : Number(context.previous.total_amount),
        });
      },
    },
  ], { packageId });
  return bindingSummary(engine, packageId);
}

function bindingSummary(engine: any, packageId: string) {
  const registrations: Array<Record<string, unknown>> = [];
  for (const [event, handlers] of engine.hooks.entries()) {
    for (const handler of handlers) {
      if (handler.packageId === packageId) {
        registrations.push({
          event,
          object: handler.object,
          priority: handler.priority,
          hookName: handler.hookName ?? null,
        });
      }
    }
  }
  return { packageId, registered: registrations.length, registrations };
}

function createSeedLoader(engine: any, logger: any) {
  const metadata = {
    getObject: async (name: string) => engine.registry.getObject(name),
  };
  return new seedModule.SeedLoaderService(engine, metadata, logger);
}

function instrumentProtocol(protocol: any, trace: TraceRecorder) {
  const originalMany = protocol.createManyData.bind(protocol);
  protocol.createManyData = async (request: any) => {
    const entry = trace.push("protocol", "createManyData", {
      object: request.object,
      ...rowDetails(request.records),
    });
    const result = await originalMany(request);
    entry.outcome = "resolved";
    return result;
  };
  const originalOne = protocol.createData.bind(protocol);
  protocol.createData = async (request: any) => {
    const entry = trace.push("protocol", "createData", {
      object: request.object,
      ...rowDetails(request.data ?? request.record),
    });
    const result = await originalOne(request);
    entry.outcome = "resolved";
    return result;
  };
}

function firstRow(value: any) {
  if (Array.isArray(value)) return value[0] ?? {};
  return value ?? {};
}

function numericRow(row: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [
    key,
    value == null || typeof value === "string" && !/^-?\d+(\.\d+)?$/.test(value)
      ? value
      : Number(value),
  ]));
}

async function auditItems(knex: any, table: string) {
  const result = await knex.raw(`
    SELECT
      COUNT(*) AS row_count,
      COUNT(DISTINCT external_key) AS unique_external_keys,
      SUM(CASE WHEN hook_marker IS NOT NULL THEN 1 ELSE 0 END) AS hook_markers,
      MIN(amount) AS min_amount,
      MAX(amount) AS max_amount,
      SUM(amount) AS amount_sum
    FROM ${table}
  `);
  return numericRow(firstRow(result));
}

async function auditDatabase(knex: any) {
  const integrity = await knex.raw("PRAGMA integrity_check");
  const tables = await knex.raw(
    "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
  );
  const tableNames = (Array.isArray(tables) ? tables : [tables])
    .map((row: any) => String(row.name));
  return {
    integrityCheck: integrity,
    tables: tableNames,
    nonQaTables: tableNames.filter(
      (name: string) => !name.startsWith("qa_") && !name.startsWith("sqlite_"),
    ),
  };
}

function entries(
  trace: TraceRecorder,
  phase: string,
  source: string,
  event: string,
  object?: string,
) {
  return trace.entries.filter((entry) =>
    entry.phase === phase
    && entry.source === source
    && entry.event === event
    && (object == null || entry.object === object),
  );
}

function phaseSummary(trace: TraceRecorder, phase: string, object: string) {
  const before = entries(trace, phase, "hook", "beforeInsert", object);
  const after = entries(trace, phase, "hook", "afterInsert", object);
  const engineInsert = entries(trace, phase, "engine", "insert", object);
  const bulkCreate = entries(trace, phase, "driver", "bulkCreate", object);
  const create = entries(trace, phase, "driver", "create", object);
  return {
    beforeInsertCalls: before.length,
    beforeShapes: [...new Set(before.map((entry) => entry.shape))],
    beforeKeys: before.map((entry) => entry.key ?? null),
    afterInsertCalls: after.length,
    afterShapes: [...new Set(after.map((entry) => entry.shape))],
    afterKeys: after.map((entry) => entry.key ?? null),
    engineInsertCalls: engineInsert.length,
    driverBulkCreateCalls: bulkCreate.length,
    driverCreateAttempts: create.length,
    driverCreateSuccesses: create.filter((entry) => entry.outcome === "resolved").length,
    batchBoundaries: bulkCreate.map((entry) => [entry.firstKey, entry.lastKey]),
  };
}

async function runNormalScenario() {
  const trace = new TraceRecorder();
  const env = await createEnvironment(
    frameworkRoot,
    databasePaths.normal,
    objectDefinitions,
    trace,
  );
  const registration = bindObservedHooks(env.engine, trace);
  const seedLoader = createSeedLoader(env.engine, env.logger);
  const protocol = new protocolModule.ObjectStackProtocolImplementation(env.engine);
  instrumentProtocol(protocol, trace);

  const seedRows = rowsFromItems(await readCsv(dataDir, "qa_seed_item.csv"));
  const importCsv = await fs.readFile(path.join(dataDir, "qa_import_item.csv"), "utf8");
  const parentRows = await readCsv(dataDir, "qa_summary_parents.csv");
  const singleRows = rowsFromChildren(
    await readCsv(dataDir, "qa_summary_child_single_parent.csv"),
  );
  const tenRows = rowsFromChildren(
    await readCsv(dataDir, "qa_summary_child_ten_parents.csv"),
  );

  trace.phase = "seed";
  const seedResult = await seedLoader.load({
    seeds: [{
      object: "qa_seed_item",
      mode: "insert",
      externalId: "external_key",
      records: seedRows,
    }],
    config: seedConfig,
  } as any);

  const rest = new restModule.RestServer(
    createMockServer() as any,
    protocol,
    { api: { requireAuth: false } } as any,
  );
  rest.registerRoutes();
  const importRoute = rest.getRoutes().find(
    (route: any) => route.method === "POST"
      && route.path === "/api/v1/data/:object/import",
  );
  if (!importRoute) throw new Error("Real import route was not registered");
  trace.phase = "import";
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
      runAutomations: true,
    },
  } as any, importResponse);

  trace.phase = "setup";
  await env.engine.insert("qa_summary_parent", parentRows.map((row) => ({
    id: row.id,
    name: row.name,
  })));

  trace.phase = "single-parent";
  const singleResult = await seedLoader.load({
    seeds: [{
      object: "qa_summary_child",
      mode: "insert",
      externalId: "external_key",
      records: singleRows,
    }],
    config: seedConfig,
  } as any);

  trace.phase = "ten-parents";
  const tenResult = await seedLoader.load({
    seeds: [{
      object: "qa_summary_child",
      mode: "insert",
      externalId: "external_key",
      records: tenRows,
    }],
    config: seedConfig,
  } as any);

  trace.phase = "audit";
  const knex = env.driver.knex;
  const childGroups = await knex.raw(`
    SELECT parent_id, COUNT(*) AS row_count,
      SUM(CASE WHEN hook_marker IS NOT NULL THEN 1 ELSE 0 END) AS hook_markers,
      SUM(amount) AS amount_sum
    FROM qa_summary_child
    GROUP BY parent_id
    ORDER BY parent_id
  `);
  const parents = await knex.raw(`
    SELECT id, name, total_amount
    FROM qa_summary_parent
    ORDER BY id
  `);
  const childMarkers = await knex.raw(`
    SELECT
      SUM(CASE WHEN external_key LIKE 'SINGLE-%' AND hook_marker IS NOT NULL THEN 1 ELSE 0 END)
        AS single_markers,
      SUM(CASE WHEN external_key LIKE 'TEN-%' AND hook_marker IS NOT NULL THEN 1 ELSE 0 END)
        AS ten_markers
    FROM qa_summary_child
  `);
  const databaseAudit = await auditDatabase(knex);

  const summaryDetails = (phase: string) => {
    const before = entries(trace, phase, "hook", "beforeUpdate", "qa_summary_parent");
    const after = entries(trace, phase, "hook", "afterUpdate", "qa_summary_parent");
    return {
      aggregateCalls: entries(
        trace,
        phase,
        "engine",
        "aggregate",
        "qa_summary_child",
      ).length,
      parentBeforeUpdateCalls: before.length,
      parentAfterUpdateCalls: after.length,
      parentOrder: after.map((entry) => entry.id),
      parentUpdateValues: after.map((entry) => entry.total),
      parentPreviousValues: after.map((entry) => entry.previousTotal),
    };
  };

  const result = {
    hookRegistration: registration,
    seed: {
      loaderResult: seedResult,
      ...phaseSummary(trace, "seed", "qa_seed_item"),
      database: await auditItems(knex, "qa_seed_item"),
    },
    import: {
      httpStatus: importResponse.statusCode ?? 200,
      routeResponse: importResponse.body,
      ...phaseSummary(trace, "import", "qa_import_item"),
      protocolCreateManyCalls: entries(
        trace,
        "import",
        "protocol",
        "createManyData",
        "qa_import_item",
      ).length,
      protocolCreateOneCalls: entries(
        trace,
        "import",
        "protocol",
        "createData",
        "qa_import_item",
      ).length,
      database: await auditItems(knex, "qa_import_item"),
    },
    singleParent: {
      loaderResult: singleResult,
      ...phaseSummary(trace, "single-parent", "qa_summary_child"),
      ...summaryDetails("single-parent"),
    },
    tenParents: {
      loaderResult: tenResult,
      ...phaseSummary(trace, "ten-parents", "qa_summary_child"),
      ...summaryDetails("ten-parents"),
    },
    database: {
      childGroups: childGroups.map(numericRow),
      parents: parents.map(numericRow),
      childMarkers: numericRow(firstRow(childMarkers)),
      ...databaseAudit,
    },
    trace: trace.entries,
    productLogs: env.logEvents,
  };
  await env.engine.destroy();
  return result;
}

async function runBeforeErrorScenario() {
  const trace = new TraceRecorder();
  const env = await createEnvironment(
    frameworkRoot,
    databasePaths.beforeError,
    [beforeErrorObjectDefinition],
    trace,
  );
  const packageId = "issue-2678-hook-qa-before-error";
  env.engine.bindHooks([
    {
      name: "qa_reject_before_insert",
      object: "qa_hook_before_error",
      events: ["beforeInsert"],
      priority: 100,
      onError: "abort",
      handler: async (context: any) => {
        trace.push("hook", "beforeInsert", hookDetails(context, context.input?.data));
        if (context.input.name === "reject_me") {
          throw new Error("QA_BEFORE_INSERT_REJECT");
        }
        context.input.hook_marker = `hooked:${context.input.external_key}`;
      },
    },
    {
      name: "qa_after_before_error_observer",
      object: "qa_hook_before_error",
      events: ["afterInsert"],
      priority: 100,
      onError: "abort",
      handler: async (context: any) => {
        trace.push("hook", "afterInsert", hookDetails(context, context.result));
      },
    },
  ], { packageId });
  const registration = bindingSummary(env.engine, packageId);
  const rows = (await readCsv(dataDir, "hook-before-error.csv")).map((row) => ({
    external_key: row.external_key,
    name: row.name,
    amount: Number(row.amount),
  }));
  const seedLoader = createSeedLoader(env.engine, env.logger);
  trace.phase = "before-error";
  const loaderResult = await seedLoader.load({
    seeds: [{
      object: "qa_hook_before_error",
      mode: "insert",
      externalId: "external_key",
      records: rows,
    }],
    config: seedConfig,
  } as any);

  trace.phase = "audit";
  const knex = env.driver.knex;
  const rejected = await knex.raw(`
    SELECT external_key, name, hook_marker
    FROM qa_hook_before_error
    WHERE external_key = 'HOOK-BEFORE-03'
  `);
  const result = {
    hookRegistration: registration,
    loaderResult,
    ...phaseSummary(trace, "before-error", "qa_hook_before_error"),
    reportedInserted: Number(loaderResult?.summary?.totalInserted ?? -1),
    reportedErrored: Number(loaderResult?.summary?.totalErrored ?? -1),
    database: {
      items: await auditItems(knex, "qa_hook_before_error"),
      rejectedRows: rejected,
      ...await auditDatabase(knex),
    },
    trace: trace.entries,
    productLogs: env.logEvents,
  };
  await env.engine.destroy();
  return result;
}

async function runAfterErrorScenario() {
  const trace = new TraceRecorder();
  const env = await createEnvironment(
    frameworkRoot,
    databasePaths.afterError,
    [afterErrorObjectDefinition],
    trace,
  );
  env.engine.registerHook("beforeInsert", async (context: any) => {
    trace.push("hook", "beforeInsert", hookDetails(context, context.input?.data));
  }, {
    object: "qa_hook_after_error",
    packageId: "issue-2678-hook-qa-after-error",
  });
  env.engine.registerHook("afterInsert", async (context: any) => {
    trace.push("hook", "afterInsert", hookDetails(context, context.result));
    const results = Array.isArray(context.result) ? context.result : [context.result];
    if (results.some((row: any) => row?.name === "reject_after")) {
      throw new Error("QA_AFTER_INSERT_REJECT");
    }
  }, {
    object: "qa_hook_after_error",
    packageId: "issue-2678-hook-qa-after-error",
  });

  const rows = (await readCsv(dataDir, "hook-after-error.csv")).map((row) => ({
    external_key: row.external_key,
    name: row.name,
    amount: Number(row.amount),
  }));
  const seedLoader = createSeedLoader(env.engine, env.logger);
  trace.phase = "after-error";
  const loaderResult = await seedLoader.load({
    seeds: [{
      object: "qa_hook_after_error",
      mode: "insert",
      externalId: "external_key",
      records: rows,
    }],
    config: seedConfig,
  } as any);

  trace.phase = "audit";
  const knex = env.driver.knex;
  const persisted = await knex.raw(`
    SELECT external_key, name, amount
    FROM qa_hook_after_error
    ORDER BY external_key
  `);
  const duplicateKeys = await knex.raw(`
    SELECT external_key, COUNT(*) AS row_count
    FROM qa_hook_after_error
    GROUP BY external_key
    HAVING COUNT(*) > 1
    ORDER BY external_key
  `);
  const result = {
    classification: "observational",
    loaderResult,
    ...phaseSummary(trace, "after-error", "qa_hook_after_error"),
    reportedInserted: Number(loaderResult?.summary?.totalInserted ?? -1),
    reportedErrored: Number(loaderResult?.summary?.totalErrored ?? -1),
    database: {
      items: await auditItems(knex, "qa_hook_after_error"),
      persistedRows: persisted.map(numericRow),
      duplicateKeys: duplicateKeys.map(numericRow),
      ...await auditDatabase(knex),
    },
    trace: trace.entries,
    productLogs: env.logEvents,
  };
  await env.engine.destroy();
  return result;
}

const startedAt = new Date().toISOString();
const normal = await runNormalScenario();
const beforeInsertError = await runBeforeErrorScenario();
const afterInsertErrorObservation = await runAfterErrorScenario();

const rawResults = {
  schemaVersion: 1,
  provenance: {
    frameworkRequestedSha: FIXED_SHA,
    frameworkActualSha: actualSha,
    attributionMerge: "21420d9f82ebdcd53a6361ded3d829723bcab18e",
    recordHookContractFix: "31d04d484eb80688d7963fbfda2140f6cc665bd0",
    sourceFixture: "framework/issue-2678/2026-07-11/reconstructed-fixtures",
  },
  parameters: {
    database: "SQLite via better-sqlite3 and @objectstack/driver-sql",
    freshDatabasePerScenario: true,
    batchSize: 200,
    writeMode: "insert",
    seedConfig,
  },
  startedAt,
  finishedAt: new Date().toISOString(),
  normal,
  beforeInsertError,
  afterInsertErrorObservation,
  evidenceBoundary: [
    "Local historical Framework target only; no cloud runtime was exercised.",
    "No throughput or latency conclusion is drawn from wrapper counts or durations.",
    "The afterInsert error case is observational because Hook rollback semantics are not established by this QA scope.",
  ],
};
await writeJson(outputPath, rawResults);
console.log(JSON.stringify({
  result: "raw-results-written",
  output: path.basename(outputPath),
  databases: Object.values(databasePaths).map((value) => path.basename(value)),
  normalHookCalls: {
    seedBefore: normal.seed.beforeInsertCalls,
    importBefore: normal.import.beforeInsertCalls,
    singleChildBefore: normal.singleParent.beforeInsertCalls,
    tenChildBefore: normal.tenParents.beforeInsertCalls,
  },
  beforeError: {
    inserted: beforeInsertError.reportedInserted,
    errored: beforeInsertError.reportedErrored,
    persisted: beforeInsertError.database.items.row_count,
  },
  afterError: {
    inserted: afterInsertErrorObservation.reportedInserted,
    errored: afterInsertErrorObservation.reportedErrored,
    persisted: afterInsertErrorObservation.database.items.row_count,
  },
}, null, 2));
