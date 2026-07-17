import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const FIXED_SHA = "98874656ffc50ce1531af52346228ffcdda73fba";

export type TraceEntry = Record<string, unknown> & {
  seq: number;
  phase: string;
  source: string;
  event: string;
};

export function parseArgs(argv: string[]) {
  const args = new Map<string, string>();
  for (let index = 2; index < argv.length; index += 2) {
    args.set(argv[index], argv[index + 1]);
  }
  return args;
}

export function assertFrameworkSha(frameworkRoot: string) {
  const actualSha = execFileSync(
    "git",
    ["-C", frameworkRoot, "rev-parse", "HEAD"],
    { encoding: "utf8" },
  ).trim();
  if (actualSha !== FIXED_SHA) {
    throw new Error(`Framework SHA mismatch: expected ${FIXED_SHA}, got ${actualSha}`);
  }
  return actualSha;
}

export async function refuseExisting(paths: string[]) {
  for (const target of paths) {
    try {
      await fs.access(target);
      throw new Error(`Refusing to overwrite existing output: ${target}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    await fs.mkdir(path.dirname(target), { recursive: true });
  }
}

export function parseCsv(text: string): Array<Record<string, string>> {
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

export async function readCsv(dataDir: string, name: string) {
  return parseCsv(await fs.readFile(path.join(dataDir, name), "utf8"));
}

export const sourceUrl = (frameworkRoot: string, relativePath: string) =>
  pathToFileURL(path.join(frameworkRoot, relativePath)).href;

export async function writeJson(target: string, value: unknown) {
  await fs.writeFile(target, `${JSON.stringify(value, null, 2)}\n`);
}

export class TraceRecorder {
  phase = "setup";
  readonly entries: TraceEntry[] = [];

  push(source: string, event: string, details: Record<string, unknown> = {}) {
    const entry: TraceEntry = {
      seq: this.entries.length + 1,
      phase: this.phase,
      source,
      event,
      ...details,
    };
    this.entries.push(entry);
    return entry;
  }
}

export function shapeOf(value: unknown) {
  if (Array.isArray(value)) return "array";
  if (value && typeof value === "object") return "record";
  if (value == null) return "null";
  return typeof value;
}

export function rowDetails(value: any) {
  const rows = Array.isArray(value) ? value : value == null ? [] : [value];
  return {
    shape: shapeOf(value),
    rows: rows.length,
    firstKey: rows[0]?.external_key ?? null,
    lastKey: rows.at(-1)?.external_key ?? null,
    key: rows.length === 1 ? rows[0]?.external_key ?? null : null,
  };
}

export function hookDetails(context: any, value: unknown) {
  return {
    object: context.object,
    ...rowDetails(value),
    session: {
      isSystem: context.session?.isSystem ?? null,
      skipTriggers: context.session?.skipTriggers ?? null,
    },
    previousTotal: context.previous?.total_amount == null
      ? null
      : Number(context.previous.total_amount),
  };
}

export function createLogger(logEvents: Array<Record<string, unknown>>) {
  const log = (level: string, message: unknown, meta?: unknown) => {
    const event = { level, message: String(message), meta };
    logEvents.push(event);
    console.log(JSON.stringify(event));
  };
  return {
    info: (message: unknown, meta?: unknown) => log("info", message, meta),
    warn: (message: unknown, meta?: unknown) => log("warn", message, meta),
    error: (message: unknown, error?: unknown, meta?: unknown) => log(
      "error",
      message,
      { error: String((error as Error)?.message ?? error), meta },
    ),
    debug: (message: unknown, meta?: unknown) => log("debug", message, meta),
  };
}

export async function createEnvironment(
  frameworkRoot: string,
  databasePath: string,
  definitions: readonly unknown[],
  trace: TraceRecorder,
) {
  const [objectqlModule, sqlModule] = await Promise.all([
    import(sourceUrl(frameworkRoot, "packages/objectql/src/engine.ts")),
    import(sourceUrl(frameworkRoot, "packages/plugins/driver-sql/src/index.ts")),
  ]);
  const logEvents: Array<Record<string, unknown>> = [];
  const logger = createLogger(logEvents);
  const driver = new sqlModule.SqlDriver({
    client: "better-sqlite3",
    connection: { filename: databasePath },
    useNullAsDefault: true,
    pool: { min: 1, max: 1 },
  });
  const engine = new objectqlModule.ObjectQL({ logger });
  engine.registerDriver(driver, true);
  for (const definition of definitions) {
    engine.registerObject(structuredClone(definition) as any, "issue-2678-hook-qa");
  }
  instrumentDriver(driver, trace);
  instrumentEngine(engine, trace);
  await engine.init();
  await driver.initObjects(definitions.map((definition) => structuredClone(definition)) as any);
  return { driver, engine, logger, logEvents };
}

function instrumentDriver(driver: any, trace: TraceRecorder) {
  const originalBulkCreate = driver.bulkCreate.bind(driver);
  driver.bulkCreate = async (object: string, data: unknown, ...rest: unknown[]) => {
    const entry = trace.push("driver", "bulkCreate", { object, ...rowDetails(data) });
    try {
      const result = await originalBulkCreate(object, data, ...rest);
      entry.outcome = "resolved";
      entry.resultRows = Array.isArray(result) ? result.length : 1;
      return result;
    } catch (error) {
      entry.outcome = "rejected";
      entry.error = String((error as Error).message ?? error);
      throw error;
    }
  };

  const originalCreate = driver.create.bind(driver);
  driver.create = async (object: string, data: unknown, ...rest: unknown[]) => {
    const entry = trace.push("driver", "create", { object, ...rowDetails(data) });
    try {
      const result = await originalCreate(object, data, ...rest);
      entry.outcome = "resolved";
      return result;
    } catch (error) {
      entry.outcome = "rejected";
      entry.error = String((error as Error).message ?? error);
      throw error;
    }
  };

  const originalUpdate = driver.update.bind(driver);
  driver.update = async (object: string, id: string | number, data: any, ...rest: unknown[]) => {
    const entry = trace.push("driver", "update", {
      object,
      id,
      total: data?.total_amount == null ? null : Number(data.total_amount),
    });
    try {
      const result = await originalUpdate(object, id, data, ...rest);
      entry.outcome = "resolved";
      return result;
    } catch (error) {
      entry.outcome = "rejected";
      entry.error = String((error as Error).message ?? error);
      throw error;
    }
  };
}

function instrumentEngine(engine: any, trace: TraceRecorder) {
  const originalInsert = engine.insert.bind(engine);
  engine.insert = async (object: string, data: unknown, options?: unknown) => {
    const entry = trace.push("engine", "insert", { object, ...rowDetails(data) });
    try {
      const result = await originalInsert(object, data, options);
      entry.outcome = "resolved";
      return result;
    } catch (error) {
      entry.outcome = "rejected";
      entry.error = String((error as Error).message ?? error);
      throw error;
    }
  };

  const originalAggregate = engine.aggregate.bind(engine);
  engine.aggregate = async (object: string, query: any, options?: unknown) => {
    const entry = trace.push("engine", "aggregate", {
      object,
      parentId: query?.where?.parent_id ?? null,
    });
    try {
      const result = await originalAggregate(object, query, options);
      entry.outcome = "resolved";
      return result;
    } catch (error) {
      entry.outcome = "rejected";
      entry.error = String((error as Error).message ?? error);
      throw error;
    }
  };

  const originalUpdate = engine.update.bind(engine);
  engine.update = async (object: string, data: any, options?: unknown) => {
    const entry = trace.push("engine", "update", {
      object,
      id: data?.id ?? null,
      total: data?.total_amount == null ? null : Number(data.total_amount),
    });
    try {
      const result = await originalUpdate(object, data, options);
      entry.outcome = "resolved";
      return result;
    } catch (error) {
      entry.outcome = "rejected";
      entry.error = String((error as Error).message ?? error);
      throw error;
    }
  };
}
