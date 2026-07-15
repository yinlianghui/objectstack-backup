// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { SeedLoaderService } from '@objectstack/metadata-protocol';
import { ObjectQL, ObjectStackProtocolImplementation } from '@objectstack/objectql';
import { SeedLoaderConfigSchema } from '@objectstack/spec/data';
import { SqlDriver } from '../../plugins/driver-sql/src/index.js';
import { runImport } from './import-runner.js';

type Row = Record<string, unknown>;

interface ObjectCallCounts {
  engineArrayInsert: number;
  engineSingleInsert: number;
  driverBulkCreate: number;
  driverCreate: number;
  parentSummaryUpdate: number;
}

interface CallTrace {
  sequence: number;
  scenario: string;
  layer: 'engine' | 'driver';
  operation: string;
  object: string;
  rowCount: number;
  uniqueParentCount?: number;
  status: 'success' | 'error';
  error?: string;
}

interface ScenarioResult {
  scenario: string;
  status: 'passed' | 'failed';
  database: string;
  elapsedMs: number;
  counts?: Record<string, ObjectCallCounts>;
  assertions?: Record<string, unknown>;
  error?: string;
}

const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const EVIDENCE_ROOT = path.join(
  REPO_ROOT,
  'docs/superpowers/reports/issue-2678-minimal-evidence',
);
const RUN_ID = process.env.ISSUE_2678_EVIDENCE_RUN_ID || 'run-001';
const RUN_DIR = path.join(EVIDENCE_ROOT, 'runs', RUN_ID);

if (!/^[a-z0-9_-]+$/i.test(RUN_ID)) {
  throw new Error(`Invalid ISSUE_2678_EVIDENCE_RUN_ID: ${RUN_ID}`);
}

fs.mkdirSync(path.join(EVIDENCE_ROOT, 'inputs'), { recursive: true });
fs.mkdirSync(path.join(EVIDENCE_ROOT, 'databases'), { recursive: true });
fs.mkdirSync(path.join(EVIDENCE_ROOT, 'traces'), { recursive: true });
fs.mkdirSync(RUN_DIR, { recursive: true });

const allTraces: CallTrace[] = [];
const scenarioResults: ScenarioResult[] = [];
let traceSequence = 0;

const logger = {
  debug() {},
  info() {},
  warn() {},
  error() {},
};

const plainFields = {
  id: { name: 'id', label: 'ID', type: 'text', primaryKey: true },
  external_key: { name: 'external_key', label: 'External Key', type: 'text', required: true, unique: true },
  name: { name: 'name', label: 'Name', type: 'text', required: true },
  amount: { name: 'amount', label: 'Amount', type: 'number', required: true },
  active: { name: 'active', label: 'Active', type: 'boolean', required: true },
};

const QA_SEED_ITEM = {
  name: 'qa_seed_item',
  label: 'QA Seed Item',
  systemFields: false,
  fields: plainFields,
};

const QA_IMPORT_ITEM = {
  name: 'qa_import_item',
  label: 'QA Import Item',
  systemFields: false,
  fields: plainFields,
};

const QA_SUMMARY_PARENT = {
  name: 'qa_summary_parent',
  label: 'QA Summary Parent',
  systemFields: false,
  fields: {
    id: { name: 'id', label: 'ID', type: 'text', primaryKey: true },
    name: { name: 'name', label: 'Name', type: 'text', required: true },
    total_amount: {
      name: 'total_amount',
      label: 'Total Amount',
      type: 'summary',
      summaryOperations: {
        object: 'qa_summary_child',
        field: 'amount',
        function: 'sum',
        relationshipField: 'parent_id',
      },
    },
  },
};

const QA_SUMMARY_CHILD = {
  name: 'qa_summary_child',
  label: 'QA Summary Child',
  systemFields: false,
  fields: {
    id: { name: 'id', label: 'ID', type: 'text', primaryKey: true },
    external_key: { name: 'external_key', label: 'External Key', type: 'text', required: true, unique: true },
    name: { name: 'name', label: 'Name', type: 'text', required: true },
    parent_id: {
      name: 'parent_id',
      label: 'Parent',
      type: 'master_detail',
      reference: 'qa_summary_parent',
      required: true,
      deleteBehavior: 'cascade',
    },
    amount: { name: 'amount', label: 'Amount', type: 'number', required: true },
  },
};

const ALL_OBJECTS = [QA_SEED_ITEM, QA_IMPORT_ITEM, QA_SUMMARY_PARENT, QA_SUMMARY_CHILD];

const makePlainRows = (): Row[] => Array.from({ length: 1000 }, (_, i) => ({
  external_key: `item_${String(i).padStart(4, '0')}`,
  name: `Evidence Item ${String(i).padStart(4, '0')}`,
  amount: i + 1,
  active: i % 2 === 0,
}));

const makeSummaryRows = (parentCount: 1 | 10): Row[] =>
  Array.from({ length: 1000 }, (_, i) => ({
    external_key: `summary_item_${String(i).padStart(4, '0')}`,
    name: `Summary Item ${String(i).padStart(4, '0')}`,
    parent_id: `parent_${String(i % parentCount).padStart(2, '0')}`,
    amount: i + 1,
  }));

const SEED_ROWS = makePlainRows();
const IMPORT_ROWS = makePlainRows();
const SUMMARY_ONE_ROWS = makeSummaryRows(1);
const SUMMARY_TEN_ROWS = makeSummaryRows(10);

function jsonText(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function writeImmutableText(file: string, content: string): void {
  if (fs.existsSync(file)) {
    const existing = fs.readFileSync(file, 'utf8');
    if (existing !== content) {
      throw new Error(`Refusing to overwrite non-identical evidence: ${file}`);
    }
    return;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, { encoding: 'utf8', flag: 'wx' });
}

function writeImmutableJson(file: string, value: unknown): void {
  writeImmutableText(file, jsonText(value));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

function projectRows(rows: Row[], fields: string[]): Row[] {
  return rows.map((row) => Object.fromEntries(fields.map((field) => [field, row[field]])));
}

function sortByExternalKey(rows: Row[]): Row[] {
  return [...rows].sort((a, b) => String(a.external_key).localeCompare(String(b.external_key)));
}

writeImmutableJson(path.join(EVIDENCE_ROOT, 'objects.json'), {
  schemaVersion: 1,
  logicalFieldNote: 'Input columns exclude generated id; SQLite also adds created_at and updated_at.',
  objects: ALL_OBJECTS,
});
writeImmutableJson(path.join(EVIDENCE_ROOT, 'inputs/seed-1000x4.json'), {
  object: QA_SEED_ITEM.name, rows: 1000, inputColumns: 4, records: SEED_ROWS,
});
writeImmutableJson(path.join(EVIDENCE_ROOT, 'inputs/import-1000x4.json'), {
  object: QA_IMPORT_ITEM.name, rows: 1000, inputColumns: 4, records: IMPORT_ROWS,
});
writeImmutableJson(path.join(EVIDENCE_ROOT, 'inputs/summary-one-parent-1000x4.json'), {
  object: QA_SUMMARY_CHILD.name, parents: 1, rows: 1000, inputColumns: 4, records: SUMMARY_ONE_ROWS,
});
writeImmutableJson(path.join(EVIDENCE_ROOT, 'inputs/summary-ten-parent-1000x4.json'), {
  object: QA_SUMMARY_CHILD.name, parents: 10, rows: 1000, inputColumns: 4, records: SUMMARY_TEN_ROWS,
});

function newCounts(): ObjectCallCounts {
  return {
    engineArrayInsert: 0,
    engineSingleInsert: 0,
    driverBulkCreate: 0,
    driverCreate: 0,
    parentSummaryUpdate: 0,
  };
}

function uniqueParentCount(data: unknown): number | undefined {
  const rows = Array.isArray(data) ? data : [data];
  const ids = new Set(rows.map((row: any) => row?.parent_id).filter(Boolean));
  return ids.size > 0 ? ids.size : undefined;
}

function instrumentWrites(scenario: string, engine: ObjectQL, driver: SqlDriver) {
  const byObject = new Map<string, ObjectCallCounts>();
  const countsFor = (object: string) => {
    let counts = byObject.get(object);
    if (!counts) {
      counts = newCounts();
      byObject.set(object, counts);
    }
    return counts;
  };
  const trace = (entry: Omit<CallTrace, 'sequence' | 'scenario'>) => {
    allTraces.push({ sequence: ++traceSequence, scenario, ...entry });
  };

  const originalInsert = engine.insert.bind(engine);
  (engine as any).insert = async (object: string, data: unknown, options?: unknown) => {
    const isArray = Array.isArray(data);
    const counts = countsFor(object);
    if (isArray) counts.engineArrayInsert += 1;
    else counts.engineSingleInsert += 1;
    try {
      const result = await originalInsert(object, data as any, options as any);
      trace({
        layer: 'engine', operation: isArray ? 'insert_array' : 'insert_single', object,
        rowCount: isArray ? data.length : 1, uniqueParentCount: uniqueParentCount(data), status: 'success',
      });
      return result;
    } catch (error) {
      trace({
        layer: 'engine', operation: isArray ? 'insert_array' : 'insert_single', object,
        rowCount: isArray ? data.length : 1, uniqueParentCount: uniqueParentCount(data),
        status: 'error', error: errorMessage(error),
      });
      throw error;
    }
  };

  const originalBulkCreate = driver.bulkCreate.bind(driver);
  (driver as any).bulkCreate = async (object: string, rows: Row[], options?: unknown) => {
    countsFor(object).driverBulkCreate += 1;
    try {
      const result = await originalBulkCreate(object, rows, options as any);
      trace({
        layer: 'driver', operation: 'bulkCreate', object, rowCount: rows.length,
        uniqueParentCount: uniqueParentCount(rows), status: 'success',
      });
      return result;
    } catch (error) {
      trace({
        layer: 'driver', operation: 'bulkCreate', object, rowCount: rows.length,
        uniqueParentCount: uniqueParentCount(rows), status: 'error', error: errorMessage(error),
      });
      throw error;
    }
  };

  const originalCreate = driver.create.bind(driver);
  (driver as any).create = async (object: string, row: Row, options?: unknown) => {
    countsFor(object).driverCreate += 1;
    try {
      const result = await originalCreate(object, row, options as any);
      trace({ layer: 'driver', operation: 'create', object, rowCount: 1, status: 'success' });
      return result;
    } catch (error) {
      trace({
        layer: 'driver', operation: 'create', object, rowCount: 1,
        status: 'error', error: errorMessage(error),
      });
      throw error;
    }
  };

  const originalUpdate = driver.update.bind(driver);
  (driver as any).update = async (object: string, id: string, data: Row, options?: unknown) => {
    const isSummaryUpdate =
      object === QA_SUMMARY_PARENT.name && Object.prototype.hasOwnProperty.call(data, 'total_amount');
    if (isSummaryUpdate) countsFor(object).parentSummaryUpdate += 1;
    try {
      const result = await originalUpdate(object, id, data, options as any);
      trace({
        layer: 'driver', operation: isSummaryUpdate ? 'update_summary' : 'update',
        object, rowCount: 1, status: 'success',
      });
      return result;
    } catch (error) {
      trace({
        layer: 'driver', operation: isSummaryUpdate ? 'update_summary' : 'update',
        object, rowCount: 1, status: 'error', error: errorMessage(error),
      });
      throw error;
    }
  };

  return {
    countsFor,
    toJSON: () => Object.fromEntries([...byObject.entries()].sort(([a], [b]) => a.localeCompare(b))),
  };
}

async function setupScenario(scenario: string, objects: any[]) {
  const database = path.join(EVIDENCE_ROOT, 'databases', `${RUN_ID}-${scenario}.sqlite`);
  if (fs.existsSync(database)) {
    throw new Error(`Refusing to overwrite retained SQLite database: ${database}`);
  }

  const driver = new SqlDriver({
    client: 'better-sqlite3',
    connection: { filename: database },
    useNullAsDefault: true,
  });
  const engine = new ObjectQL({ logger });
  for (const object of objects) engine.registry.registerObject(object as any);
  engine.registerDriver(driver as any, true);
  await driver.initObjects(objects as any[]);
  await engine.init();
  const instrumentation = instrumentWrites(scenario, engine, driver);

  return {
    database,
    driver,
    engine,
    knex: (driver as any).knex,
    instrumentation,
    close: () => engine.destroy(),
  };
}

async function readProjectedRows(engine: ObjectQL, object: string, fields: string[]): Promise<Row[]> {
  const rows = await engine.find(object, {
    fields: ['id', ...fields],
    orderBy: [{ field: 'external_key', order: 'asc' }],
    limit: 2000,
  } as any);
  return projectRows(sortByExternalKey(rows as Row[]), fields);
}

async function databaseFacts(knex: any, table: string) {
  const integrityRows = await knex.raw('PRAGMA integrity_check');
  const first = Array.isArray(integrityRows) ? integrityRows[0] : integrityRows;
  const integrity = first && typeof first === 'object' ? Object.values(first)[0] : first;
  const columns = Object.keys(await knex(table).columnInfo()).sort();
  return { integrity, columns };
}

describe.sequential('issue #2678 最小补充证据', () => {
  it('Seed：1,000 行 × 4 列通过真实 SeedLoaderService 批量落库', async () => {
    const started = performance.now();
    const ctx = await setupScenario('seed', [QA_SEED_ITEM]);
    const outcome: ScenarioResult = {
      scenario: 'seed', status: 'failed', database: ctx.database, elapsedMs: 0,
    };
    try {
      const objectMap = new Map([[QA_SEED_ITEM.name, QA_SEED_ITEM]]);
      const metadata = {
        getObject: async (name: string) => objectMap.get(name),
        listObjects: async () => [...objectMap.values()],
        register: async () => {},
        get: async (_type: string, name: string) => objectMap.get(name),
        list: async () => [],
        unregister: async () => {},
        exists: async () => false,
        listNames: async () => [...objectMap.keys()],
      };
      const loader = new SeedLoaderService(ctx.engine as any, metadata as any, logger as any);
      const seedResult = await loader.load({
        seeds: [{
          object: QA_SEED_ITEM.name,
          mode: 'insert',
          externalId: 'external_key',
          env: ['test'],
          records: SEED_ROWS,
        } as any],
        config: SeedLoaderConfigSchema.parse({
          env: 'test', dryRun: false, haltOnError: true,
          multiPass: true, defaultMode: 'insert', transaction: false,
        }),
      });

      const persisted = await readProjectedRows(
        ctx.engine, QA_SEED_ITEM.name, ['external_key', 'name', 'amount', 'active'],
      );
      const counts = ctx.instrumentation.countsFor(QA_SEED_ITEM.name);
      const facts = await databaseFacts(ctx.knex, QA_SEED_ITEM.name);
      const amountTotal = persisted.reduce((sum, row) => sum + Number(row.amount), 0);
      const trueCount = persisted.filter((row) => row.active === true).length;

      expect(seedResult.success).toBe(true);
      expect(seedResult.summary.totalInserted).toBe(1000);
      expect(seedResult.summary.totalErrored).toBe(0);
      expect(counts).toMatchObject({
        engineArrayInsert: 5, engineSingleInsert: 0,
        driverBulkCreate: 5, driverCreate: 0,
      });
      expect(persisted).toEqual(SEED_ROWS);
      expect(amountTotal).toBe(500500);
      expect(trueCount).toBe(500);
      expect(persisted.length - trueCount).toBe(500);
      expect(facts.integrity).toBe('ok');

      outcome.status = 'passed';
      outcome.counts = ctx.instrumentation.toJSON();
      outcome.assertions = {
        inputRows: 1000, inputColumns: 4, persistedRows: persisted.length,
        amountTotal, activeTrue: trueCount, activeFalse: persisted.length - trueCount,
        first: persisted[0], middle: persisted[500], last: persisted[999],
        sqliteIntegrity: facts.integrity, physicalColumns: facts.columns,
        seedSummary: seedResult.summary,
      };
    } catch (error) {
      outcome.error = errorMessage(error);
      throw error;
    } finally {
      outcome.elapsedMs = Number((performance.now() - started).toFixed(3));
      scenarioResults.push(outcome);
      await ctx.close();
    }
  });

  it('Import：1,000 行 × 4 列通过真实 Import Runner 和协议层批量落库', async () => {
    const started = performance.now();
    const ctx = await setupScenario('import', [QA_IMPORT_ITEM]);
    const outcome: ScenarioResult = {
      scenario: 'import', status: 'failed', database: ctx.database, elapsedMs: 0,
    };
    try {
      const protocol = new ObjectStackProtocolImplementation(ctx.engine as any);
      const metaMap = new Map([
        ['external_key', { name: 'external_key', type: 'text', label: 'External Key' }],
        ['name', { name: 'name', type: 'text', label: 'Name' }],
        ['amount', { name: 'amount', type: 'number', label: 'Amount' }],
        ['active', { name: 'active', type: 'boolean', label: 'Active' }],
      ]);
      const importResult = await runImport({
        p: protocol,
        objectName: QA_IMPORT_ITEM.name,
        rows: IMPORT_ROWS,
        metaMap,
        writeMode: 'insert',
        matchFields: ['external_key'],
        dryRun: false,
        runAutomations: false,
        trimWhitespace: true,
        createMissingOptions: false,
        skipBlankMatchKey: true,
        progressEvery: 200,
      });

      const persisted = await readProjectedRows(
        ctx.engine, QA_IMPORT_ITEM.name, ['external_key', 'name', 'amount', 'active'],
      );
      const counts = ctx.instrumentation.countsFor(QA_IMPORT_ITEM.name);
      const facts = await databaseFacts(ctx.knex, QA_IMPORT_ITEM.name);
      const amountTotal = persisted.reduce((sum, row) => sum + Number(row.amount), 0);
      const trueCount = persisted.filter((row) => row.active === true).length;

      expect(importResult).toMatchObject({
        total: 1000, processed: 1000, ok: 1000, created: 1000,
        updated: 0, skipped: 0, errors: 0, cancelled: false,
      });
      expect(counts).toMatchObject({
        engineArrayInsert: 5, engineSingleInsert: 0,
        driverBulkCreate: 5, driverCreate: 0,
      });
      expect(persisted).toEqual(IMPORT_ROWS);
      expect(amountTotal).toBe(500500);
      expect(trueCount).toBe(500);
      expect(persisted.length - trueCount).toBe(500);
      expect(facts.integrity).toBe('ok');

      outcome.status = 'passed';
      outcome.counts = ctx.instrumentation.toJSON();
      outcome.assertions = {
        inputRows: 1000, inputColumns: 4, persistedRows: persisted.length,
        amountTotal, activeTrue: trueCount, activeFalse: persisted.length - trueCount,
        first: persisted[0], middle: persisted[500], last: persisted[999],
        sqliteIntegrity: facts.integrity, physicalColumns: facts.columns,
        importSummary: importResult,
      };
    } catch (error) {
      outcome.error = errorMessage(error);
      throw error;
    } finally {
      outcome.elapsedMs = Number((performance.now() - started).toFixed(3));
      scenarioResults.push(outcome);
      await ctx.close();
    }
  });

  async function runSummaryScenario(parentCount: 1 | 10): Promise<void> {
    const scenario = parentCount === 1 ? 'summary-one-parent' : 'summary-ten-parent';
    const input = parentCount === 1 ? SUMMARY_ONE_ROWS : SUMMARY_TEN_ROWS;
    const started = performance.now();
    const ctx = await setupScenario(scenario, [QA_SUMMARY_PARENT, QA_SUMMARY_CHILD]);
    const outcome: ScenarioResult = {
      scenario, status: 'failed', database: ctx.database, elapsedMs: 0,
    };
    try {
      for (let i = 0; i < parentCount; i++) {
        await ctx.engine.insert(QA_SUMMARY_PARENT.name, {
          id: `parent_${String(i).padStart(2, '0')}`,
          name: `Evidence Parent ${String(i).padStart(2, '0')}`,
        });
      }
      for (let offset = 0; offset < input.length; offset += 200) {
        await ctx.engine.insert(QA_SUMMARY_CHILD.name, input.slice(offset, offset + 200));
      }

      const persisted = await readProjectedRows(
        ctx.engine,
        QA_SUMMARY_CHILD.name,
        ['external_key', 'name', 'parent_id', 'amount'],
      );
      const parents = await ctx.engine.find(QA_SUMMARY_PARENT.name, {
        fields: ['id', 'name', 'total_amount'],
        orderBy: [{ field: 'id', order: 'asc' }],
        limit: 20,
      } as any) as Row[];
      const parentTotals = [...parents]
        .sort((a, b) => String(a.id).localeCompare(String(b.id)))
        .map((row) => Number(row.total_amount));
      const expectedTotals = parentCount === 1
        ? [500500]
        : Array.from({ length: 10 }, (_, i) => 49600 + i * 100);
      const childCounts = ctx.instrumentation.countsFor(QA_SUMMARY_CHILD.name);
      const parentCounts = ctx.instrumentation.countsFor(QA_SUMMARY_PARENT.name);
      const parentFacts = await databaseFacts(ctx.knex, QA_SUMMARY_PARENT.name);
      const childFacts = await databaseFacts(ctx.knex, QA_SUMMARY_CHILD.name);

      expect(childCounts).toMatchObject({
        engineArrayInsert: 5, engineSingleInsert: 0,
        driverBulkCreate: 5, driverCreate: 0,
      });
      expect(parentCounts.parentSummaryUpdate).toBe(5 * parentCount);
      expect(persisted).toEqual(input);
      expect(persisted).toHaveLength(1000);
      expect(parents).toHaveLength(parentCount);
      expect(parentTotals).toEqual(expectedTotals);
      expect(parentTotals.reduce((sum, value) => sum + value, 0)).toBe(500500);
      expect(parentFacts.integrity).toBe('ok');
      expect(childFacts.integrity).toBe('ok');

      const childrenPerParent = Object.fromEntries(
        Array.from({ length: parentCount }, (_, i) => {
          const id = `parent_${String(i).padStart(2, '0')}`;
          return [id, persisted.filter((row) => row.parent_id === id).length];
        }),
      );
      expect(Object.values(childrenPerParent)).toEqual(Array(parentCount).fill(1000 / parentCount));

      outcome.status = 'passed';
      outcome.counts = ctx.instrumentation.toJSON();
      outcome.assertions = {
        inputRows: 1000, inputColumns: 4, persistedRows: persisted.length,
        parentCount, childrenPerParent, parentTotals,
        combinedTotal: parentTotals.reduce((sum, value) => sum + value, 0),
        first: persisted[0], middle: persisted[500], last: persisted[999],
        sqliteIntegrity: childFacts.integrity,
        parentPhysicalColumns: parentFacts.columns,
        childPhysicalColumns: childFacts.columns,
      };
    } catch (error) {
      outcome.error = errorMessage(error);
      throw error;
    } finally {
      outcome.elapsedMs = Number((performance.now() - started).toFixed(3));
      scenarioResults.push(outcome);
      await ctx.close();
    }
  }

  it('汇总：1 个父节点在 5 个批次中只重算 5 次', async () => {
    await runSummaryScenario(1);
  });

  it('汇总：10 个父节点在 5 个批次中只重算 50 次', async () => {
    await runSummaryScenario(10);
  });

  afterAll(() => {
    const passed = scenarioResults.filter((result) => result.status === 'passed').length;
    const failed = scenarioResults.filter((result) => result.status === 'failed').length;
    const runResult = {
      schemaVersion: 1,
      runId: RUN_ID,
      completedAt: new Date().toISOString(),
      frameworkCommit: '98874656ffc50ce1531af52346228ffcdda73fba',
      environment: 'local better-sqlite3 on macOS arm64',
      acceptanceBatchSize: 200,
      elapsedTimeClassification: 'informational_only_not_cloud_performance',
      status: failed === 0 && passed === 4 ? 'passed' : 'failed',
      passed,
      failed,
      scenarios: scenarioResults,
    };
    writeImmutableJson(path.join(RUN_DIR, 'results.json'), runResult);
    writeImmutableJson(path.join(RUN_DIR, 'calls.json'), allTraces);
    const rootTrace = RUN_ID === 'run-001'
      ? path.join(EVIDENCE_ROOT, 'traces/calls.json')
      : path.join(EVIDENCE_ROOT, `traces/calls-${RUN_ID}.json`);
    writeImmutableJson(rootTrace, allTraces);
  });
});
