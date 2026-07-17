import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildSeedGroups,
  normalizeCompileOutput,
  parseCsv,
  renderObjectsModule,
  resolveExcelJs,
  resolveJsZip,
  writeSingleSheetWorkbook,
} from './build-artifacts.mjs';

const packageRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const archiveRoot = path.dirname(packageRoot);

test('parses quoted CSV and preserves row count', () => {
  assert.deepEqual(parseCsv('a,b\n"x,y",2\n'), [{ a: 'x,y', b: '2' }]);
});

test('builds the exact manual and seeded groups', async () => {
  const groups = await buildSeedGroups(path.join(archiveRoot, 'data'));
  assert.equal(groups.parents.length, 11);
  assert.equal(groups.seedItems.length, 1000);
  assert.equal(groups.importItems.length, 1000);
  assert.equal(groups.singleChildren.length, 1000);
  assert.equal(groups.tenChildren.length, 1000);
  assert.deepEqual(groups.parents[0], { id: 'parent_single', name: 'parent_single' });
  assert.deepEqual(groups.importItems[0], {
    external_key: 'IMPORT-0001',
    name: 'Import Item 0001',
    amount: 1,
    active: false,
  });
});

test('generated object source is traceable to the canonical source', async () => {
  const canonical = await fs.readFile(
    path.join(archiveRoot, 'source/object-definitions.ts'),
    'utf8',
  );
  const generated = renderObjectsModule(canonical);
  assert.match(generated, /GENERATED.*object-definitions\.ts/);
  assert.match(generated, /name: "qa_summary_parent"/);
  assert.match(generated, /relationshipField: "parent_id"/);
  assert.equal(
    [...generated.matchAll(/tenancy: \{ enabled: false, strategy: "shared" \}/g)].length,
    4,
  );
  assert.doesNotMatch(generated, /tenancy: \{ enabled: false \},/);
});

test('normalizes compile evidence for a portable archive', () => {
  assert.deepEqual(
    normalizeCompileOutput({
      success: true,
      output: '/private/tmp/local/dist/manual/objectstack.json',
      duration: 321,
      warnings: [],
      stats: { objects: 4 },
    }, 'manual'),
    {
      success: true,
      output: 'dist/manual/objectstack.json',
      warnings: [],
      stats: { objects: 4 },
    },
  );
});

test('writes exactly one worksheet with headers and typed rows', async (context) => {
  if (!process.env.FRAMEWORK_ROOT) {
    context.skip('Set FRAMEWORK_ROOT to run the XLSX integration test.');
    return;
  }
  const ExcelJS = await resolveExcelJs(process.env.FRAMEWORK_ROOT);
  const JSZip = await resolveJsZip(process.env.FRAMEWORK_ROOT);
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-xlsx-test-'));
  try {
    const file = path.join(directory, 'sample.xlsx');
    await writeSingleSheetWorkbook(ExcelJS, JSZip, file, 'Import Items', [
      { external_key: 'A', name: 'One', amount: 1, active: true },
      { external_key: 'B', name: 'Two', amount: 2, active: false },
    ]);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(file);
    assert.equal(workbook.worksheets.length, 1);
    assert.equal(workbook.worksheets[0].name, 'Import Items');
    assert.equal(workbook.worksheets[0].rowCount, 3);
    assert.deepEqual(
      workbook.worksheets[0].getRow(1).values.slice(1),
      ['external_key', 'name', 'amount', 'active'],
    );
    assert.deepEqual(
      workbook.worksheets[0].getRow(2).values.slice(1),
      ['A', 'One', 1, true],
    );
    const zip = await JSZip.loadAsync(await fs.readFile(file));
    assert.ok(
      Object.values(zip.files).every(
        (entry) => entry.date.toISOString() === '2026-07-17T00:00:00.000Z',
      ),
    );
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
