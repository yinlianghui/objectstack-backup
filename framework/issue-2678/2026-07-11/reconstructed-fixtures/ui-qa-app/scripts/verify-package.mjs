import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  parseCsv,
  renderObjectsModule,
  resolveExcelJs,
} from './build-artifacts.mjs';
import { validateFrameworkRoot } from './package-lib.mjs';

const OBJECTS = [
  'qa_import_item',
  'qa_seed_item',
  'qa_summary_child',
  'qa_summary_parent',
];

const FIXTURES = [
  {
    base: 'qa_import_item',
    headers: ['external_key', 'name', 'amount', 'active'],
  },
  {
    base: 'qa_summary_child_single_parent',
    headers: ['external_key', 'name', 'parent_id', 'amount'],
  },
  {
    base: 'qa_summary_child_ten_parents',
    headers: ['external_key', 'name', 'parent_id', 'amount'],
  },
];

function fail(message) {
  throw new Error(`Package verification failed: ${message}`);
}

function equal(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(`${label}; expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

async function readJson(file) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (error) {
    fail(`${file}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function fileSha256(file) {
  return crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex');
}

async function requireFiles(packageRoot, paths) {
  for (const relative of paths) {
    const file = path.join(packageRoot, relative);
    try {
      const stat = await fs.stat(file);
      if (!stat.isFile()) fail(`${file} is not a file`);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Package verification failed:')) throw error;
      fail(`missing required file ${file}`);
    }
  }
}

async function allRelativeFiles(root, current = root) {
  const output = [];
  for (const entry of await fs.readdir(current, { withFileTypes: true })) {
    const absolute = path.join(current, entry.name);
    if (entry.isDirectory()) output.push(...await allRelativeFiles(root, absolute));
    else output.push(path.relative(root, absolute));
  }
  return output;
}

export function artifactDataCounts(artifact) {
  const counts = {};
  for (const group of artifact.data ?? []) {
    counts[group.object] = (counts[group.object] ?? 0) + (group.records?.length ?? 0);
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function parseArgs(argv, env = process.env) {
  if (argv.length === 0 && env.FRAMEWORK_ROOT) return path.resolve(env.FRAMEWORK_ROOT);
  if (argv.length !== 2 || argv[0] !== '--framework-root' || !argv[1]) {
    throw new Error('Usage: node scripts/verify-package.mjs --framework-root /path/to/framework');
  }
  return path.resolve(argv[1]);
}

function gitSha(root) {
  const result = spawnSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' });
  if (result.status !== 0) fail(`unable to read Framework SHA: ${result.stderr.trim()}`);
  return result.stdout.trim();
}

async function verifyArtifact(packageRoot, mode, expectedCounts) {
  const artifactFile = path.join(packageRoot, `dist/${mode}/objectstack.json`);
  const provenanceFile = path.join(packageRoot, `dist/${mode}/build-provenance.json`);
  const artifact = await readJson(artifactFile);
  const provenance = await readJson(provenanceFile);
  equal([...artifact.objects.map(({ name }) => name)].sort(), OBJECTS, `${artifactFile} objects`);
  equal(artifact.apps.map(({ name }) => name), ['qa_issue_2678_app'], `${artifactFile} apps`);
  equal([...(artifact.requires ?? [])].sort(), ['auth', 'ui'], `${artifactFile} requirements`);
  equal(artifactDataCounts(artifact), expectedCounts, `${artifactFile} seed counts`);
  equal(provenance.mode, mode, `${provenanceFile} mode`);
  equal(provenance.artifactSha256, await fileSha256(artifactFile), `${provenanceFile} artifact hash`);
  if (!/^[0-9a-f]{40}$/.test(provenance.frameworkSha ?? '')) {
    fail(`${provenanceFile} has an invalid Framework SHA`);
  }
  if (provenance.compileOutput?.success !== true) fail(`${provenanceFile} compile did not succeed`);
  return provenance.frameworkSha;
}

async function verifyFixture(packageRoot, ExcelJS, definition) {
  const csvFile = path.join(packageRoot, `fixtures/csv/${definition.base}.csv`);
  const xlsxFile = path.join(packageRoot, `fixtures/xlsx/${definition.base}.xlsx`);
  const csvRows = parseCsv(await fs.readFile(csvFile, 'utf8'));
  equal(Object.keys(csvRows[0] ?? {}), definition.headers, `${csvFile} headers`);
  equal(csvRows.length, 1000, `${csvFile} row count`);
  equal(csvRows.reduce((sum, row) => sum + Number(row.amount), 0), 500500, `${csvFile} amount sum`);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(xlsxFile);
  equal(workbook.worksheets.length, 1, `${xlsxFile} worksheet count`);
  const worksheet = workbook.worksheets[0];
  equal(worksheet.rowCount, 1001, `${xlsxFile} used row count`);
  const headers = worksheet.getRow(1).values.slice(1);
  equal(headers, definition.headers, `${xlsxFile} headers`);
  const amountColumn = headers.indexOf('amount') + 1;
  equal(
    worksheet.getColumn(amountColumn).values.slice(2).reduce((sum, value) => sum + Number(value), 0),
    500500,
    `${xlsxFile} amount sum`,
  );
  return { csv: path.basename(csvFile), xlsx: path.basename(xlsxFile), rows: csvRows };
}

async function verifyParentDistributions(results) {
  const single = results.find(({ csv }) => csv.startsWith('qa_summary_child_single_parent'));
  const ten = results.find(({ csv }) => csv.startsWith('qa_summary_child_ten_parents'));
  equal([...new Set(single.rows.map(({ parent_id }) => parent_id))], ['parent_single'], 'single-parent distribution');
  const tenCounts = Object.groupBy(ten.rows, ({ parent_id }) => parent_id);
  equal(Object.keys(tenCounts).sort(), Array.from({ length: 10 }, (_, index) => `parent_${String(index + 1).padStart(2, '0')}`), 'ten-parent ids');
  equal(Object.values(tenCounts).map((rows) => rows.length), Array(10).fill(100), 'ten-parent counts');
}

async function verifyCanonicalSource(packageRoot) {
  const archiveRoot = path.dirname(packageRoot);
  const canonicalFile = path.join(archiveRoot, 'source/object-definitions.ts');
  try {
    const canonical = await fs.readFile(canonicalFile, 'utf8');
    const generated = await fs.readFile(path.join(packageRoot, 'src/objects.generated.ts'), 'utf8');
    equal(generated, renderObjectsModule(canonical), 'generated object source');
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

export async function verifyPackage(argv, env = process.env) {
  const frameworkRoot = await validateFrameworkRoot(parseArgs(argv, env));
  const packageRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
  const required = [
    'package.json', 'README.md', 'expected-results.json',
    'dist/manual/objectstack.json', 'dist/manual/build-provenance.json',
    'dist/seeded/objectstack.json', 'dist/seeded/build-provenance.json',
    ...FIXTURES.flatMap(({ base }) => [`fixtures/csv/${base}.csv`, `fixtures/xlsx/${base}.xlsx`]),
  ];
  await requireFiles(packageRoot, required);
  const files = await allRelativeFiles(packageRoot);
  const forbidden = files.filter((file) => file.endsWith('.xls') || /combined|audit-workbook/i.test(file));
  equal(forbidden, [], 'forbidden fixture files');
  for (const directory of ['node_modules', '.git', 'tmp', 'logs']) {
    try {
      await fs.stat(path.join(packageRoot, directory));
      fail(`forbidden directory exists: ${directory}`);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }

  const manualSha = await verifyArtifact(packageRoot, 'manual', { qa_summary_parent: 11 });
  const seededSha = await verifyArtifact(packageRoot, 'seeded', {
    qa_import_item: 1000,
    qa_seed_item: 1000,
    qa_summary_child: 2000,
    qa_summary_parent: 11,
  });
  equal(manualSha, seededSha, 'artifact build Framework SHAs');

  const ExcelJS = await resolveExcelJs(frameworkRoot);
  const fixtureResults = [];
  for (const definition of FIXTURES) {
    fixtureResults.push(await verifyFixture(packageRoot, ExcelJS, definition));
  }
  await verifyParentDistributions(fixtureResults);
  const expected = await readJson(path.join(packageRoot, 'expected-results.json'));
  equal(expected.datasets.qa_import_item.rowCount, 1000, 'expected import row count');
  equal(expected.datasets.qa_import_item.amountSum, 500500, 'expected import amount sum');
  equal(expected.summary.singleParent.parents[0].expected_total_amount, 500500, 'expected single-parent total');
  equal(expected.summary.tenParents.parents.map(({ expected_total_amount }) => expected_total_amount), Array.from({ length: 10 }, (_, index) => 49600 + index * 100), 'expected ten-parent totals');

  return {
    ok: true,
    packageRoot,
    frameworkRoot,
    frameworkSha: gitSha(frameworkRoot),
    artifactBuildFrameworkSha: manualSha,
    objects: OBJECTS.length,
    artifacts: 2,
    csvFiles: FIXTURES.length,
    xlsxFiles: FIXTURES.length,
    forbiddenPaths: 0,
    canonicalSourceChecked: await verifyCanonicalSource(packageRoot),
  };
}

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  try {
    console.log(JSON.stringify(await verifyPackage(process.argv.slice(2)), null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
