import test from 'node:test';
import assert from 'node:assert/strict';

import { prepareLocal } from './prepare-local.mjs';

test('skips Console build when it already exists', async () => {
  let builds = 0;
  const result = await prepareLocal('/framework', {
    validateRoot: async (root) => root,
    verify: async () => ({ ok: true }),
    consoleExists: async () => true,
    runBuild: () => { builds += 1; },
    log: () => {},
  });

  assert.deepEqual(result, { frameworkRoot: '/framework', consoleBuilt: false });
  assert.equal(builds, 0);
});

test('builds Console once when it is missing', async () => {
  let checks = 0;
  let builds = 0;
  const result = await prepareLocal('/framework', {
    validateRoot: async (root) => root,
    verify: async () => ({ ok: true }),
    consoleExists: async () => {
      checks += 1;
      return checks === 2;
    },
    runBuild: () => { builds += 1; },
    log: () => {},
  });

  assert.deepEqual(result, { frameworkRoot: '/framework', consoleBuilt: true });
  assert.equal(builds, 1);
});

test('fails when the build does not produce Console', async () => {
  await assert.rejects(prepareLocal('/framework', {
    validateRoot: async (root) => root,
    verify: async () => ({ ok: true }),
    consoleExists: async () => false,
    runBuild: () => {},
    log: () => {},
  }), /Console.*未生成/);
});

test('validates before verification or build', async () => {
  let verified = false;
  let built = false;

  await assert.rejects(prepareLocal('/wrong', {
    validateRoot: async () => {
      throw new Error('必须先进入 Framework 根目录');
    },
    verify: async () => { verified = true; },
    consoleExists: async () => false,
    runBuild: () => { built = true; },
    log: () => {},
  }), /Framework 根目录/);

  assert.equal(verified, false);
  assert.equal(built, false);
});
