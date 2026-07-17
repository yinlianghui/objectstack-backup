import test from 'node:test';
import assert from 'node:assert/strict';

import { artifactDataCounts } from './verify-package.mjs';

test('summarizes compiled artifact seed groups by object', () => {
  assert.deepEqual(
    artifactDataCounts({
      data: [
        { object: 'qa_summary_parent', records: [{}, {}] },
        { object: 'qa_import_item', records: [{}] },
      ],
    }),
    { qa_import_item: 1, qa_summary_parent: 2 },
  );
});
