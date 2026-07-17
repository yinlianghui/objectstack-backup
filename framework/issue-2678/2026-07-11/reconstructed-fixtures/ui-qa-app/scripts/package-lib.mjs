import fs from 'node:fs/promises';
import path from 'node:path';

const MODES = new Set(['manual', 'seeded']);

function readFlags(argv) {
  if (argv.length % 2 !== 0) {
    throw new Error(`Every option requires a value; received: ${argv.join(' ')}`);
  }
  const flags = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    if (!name.startsWith('--')) throw new Error(`Unknown positional argument: ${name}`);
    if (flags.has(name)) throw new Error(`Duplicate option: ${name}`);
    flags.set(name, argv[index + 1]);
  }
  return flags;
}

export function parseStartArgs(argv, env = process.env) {
  const flags = readFlags(argv);
  const allowed = new Set(['--framework-root', '--mode', '--port']);
  for (const name of flags.keys()) {
    if (!allowed.has(name)) throw new Error(`Unknown option: ${name}`);
  }

  const rootValue = flags.get('--framework-root') ?? env.FRAMEWORK_ROOT;
  if (!rootValue) {
    throw new Error('Provide an existing Framework checkout with --framework-root or FRAMEWORK_ROOT.');
  }
  const mode = flags.get('--mode') ?? 'manual';
  if (!MODES.has(mode)) throw new Error('Mode must be manual or seeded.');

  const portText = flags.get('--port');
  const port = Number(portText);
  if (!portText || !Number.isInteger(port) || port < 1024 || port > 65535 || port === 3000) {
    throw new Error('Provide a high port from 1024 through 65535 other than shared port 3000.');
  }

  return { frameworkRoot: path.resolve(rootValue), mode, port };
}

export function artifactForMode(packageRoot, mode) {
  if (!MODES.has(mode)) throw new Error('Mode must be manual or seeded.');
  return path.join(path.resolve(packageRoot), 'dist', mode, 'objectstack.json');
}

export function frameworkCliArgs(frameworkRoot, args) {
  return [
    '--dir', path.resolve(frameworkRoot),
    '--filter', '@objectstack/cli',
    'exec', 'objectstack',
    ...args,
  ];
}

export async function validateFrameworkRoot(root) {
  const absolute = path.resolve(root);
  const required = [
    '.git',
    'pnpm-workspace.yaml',
    'packages/cli/bin/run.js',
    'packages/cli/dist/index.js',
    'packages/cli/node_modules',
  ];
  const missing = [];
  for (const relative of required) {
    try {
      await fs.stat(path.join(absolute, relative));
    } catch {
      missing.push(relative);
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `Expected an existing Framework checkout with installed and built CLI at ${absolute}; missing: ${missing.join(', ')}`,
    );
  }
  return absolute;
}
