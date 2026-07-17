import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

import {
  artifactForMode,
  frameworkCliArgs,
  freshUiCliArgs,
  parseStartArgs,
  validateFrameworkRoot,
} from './package-lib.mjs';

test('parses an explicit existing-framework launch', () => {
  assert.deepEqual(
    parseStartArgs([
      '--framework-root',
      '/repo/framework',
      '--mode',
      'seeded',
      '--port',
      '38421',
    ], {}),
    { frameworkRoot: '/repo/framework', mode: 'seeded', port: 38421 },
  );
});

test('defaults to manual mode and reads FRAMEWORK_ROOT', () => {
  assert.deepEqual(
    parseStartArgs(['--port', '38422'], { FRAMEWORK_ROOT: '/repo/framework' }),
    { frameworkRoot: '/repo/framework', mode: 'manual', port: 38422 },
  );
});

test('rejects missing roots, invalid modes, and unsafe ports', () => {
  assert.throws(() => parseStartArgs(['--port', '38421'], {}), /framework-root/i);
  assert.throws(
    () => parseStartArgs([
      '--framework-root', '/x', '--mode', 'other', '--port', '38421',
    ], {}),
    /manual.*seeded/i,
  );
  assert.throws(
    () => parseStartArgs(['--framework-root', '/x', '--port', '3000'], {}),
    /high port/i,
  );
});

test('resolves artifacts and CLI invocation without changing Framework', () => {
  assert.equal(
    artifactForMode('/pkg', 'manual'),
    path.join('/pkg', 'dist/manual/objectstack.json'),
  );
  assert.deepEqual(
    frameworkCliArgs('/repo/framework', ['--version']).slice(-2),
    ['objectstack', '--version'],
  );
});

test('builds a fresh UI command for the selected artifact', () => {
  assert.deepEqual(
    freshUiCliArgs('/repo/framework', '/pkg/dist/manual/objectstack.json', 38421).slice(-7),
    [
      'dev', '--artifact', '/pkg/dist/manual/objectstack.json',
      '--fresh', '--ui', '--port', '38421',
    ],
  );
});

test('rejects a directory that is not a prepared Framework checkout', async () => {
  await assert.rejects(
    validateFrameworkRoot('/definitely/missing'),
    /existing Framework/i,
  );
});
