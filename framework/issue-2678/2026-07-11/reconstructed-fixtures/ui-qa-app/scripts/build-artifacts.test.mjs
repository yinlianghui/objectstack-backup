import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildSeedGroups,
  normalizeCompileOutput,
  parseCsv,
  renderObjectsModule,
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
