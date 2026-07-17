import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  artifactForMode,
  freshUiCliArgs,
  parseStartArgs,
  validateFrameworkRoot,
} from './package-lib.mjs';

function gitValue(root, args) {
  const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr.trim() || 'Unable to inspect Framework Git state.');
  return result.stdout.trim();
}

async function requireFile(file, message) {
  try {
    const stat = await fs.stat(file);
    if (!stat.isFile()) throw new Error(message);
  } catch {
    throw new Error(message);
  }
}

export async function startUi(argv, env = process.env) {
  const args = parseStartArgs(argv, env);
  const frameworkRoot = await validateFrameworkRoot(args.frameworkRoot);
  const packageRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
  const artifact = artifactForMode(packageRoot, args.mode);
  await requireFile(artifact, `Missing compiled ${args.mode} artifact: ${artifact}`);
  const consoleIndex = path.join(frameworkRoot, 'packages/console/dist/index.html');
  await requireFile(
    consoleIndex,
    `Bundled Console is missing. Prepare it once with: pnpm -C ${frameworkRoot} objectui:build`,
  );

  const frameworkSha = gitValue(frameworkRoot, ['rev-parse', 'HEAD']);
  const frameworkDirty = gitValue(frameworkRoot, ['status', '--porcelain']).length > 0;
  const command = freshUiCliArgs(frameworkRoot, artifact, args.port);
  console.log(JSON.stringify({
    mode: args.mode,
    port: args.port,
    url: `http://localhost:${args.port}/_console/`,
    artifact,
    frameworkRoot,
    frameworkSha,
    frameworkDirty,
    freshDatabase: true,
    adminEmail: 'admin@objectos.ai',
    adminPassword: 'admin123',
  }, null, 2));

  const child = spawn('pnpm', command, { stdio: 'inherit' });
  let forwarded = false;
  const forward = (signal) => {
    if (!forwarded && child.exitCode === null && child.signalCode === null) {
      forwarded = true;
      child.kill(signal);
    }
  };
  const onInterrupt = () => forward('SIGINT');
  const onTerminate = () => forward('SIGTERM');
  process.once('SIGINT', onInterrupt);
  process.once('SIGTERM', onTerminate);

  const result = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => resolve({ code, signal }));
  }).finally(() => {
    process.removeListener('SIGINT', onInterrupt);
    process.removeListener('SIGTERM', onTerminate);
  });
  if (result.signal) {
    console.error(`Framework process exited after ${result.signal}.`);
    process.exitCode = 1;
  } else {
    process.exitCode = result.code ?? 1;
  }
}

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  try {
    await startUi(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
