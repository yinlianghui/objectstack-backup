import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { validateFrameworkRoot } from './package-lib.mjs';
import { verifyPackage } from './verify-package.mjs';

async function fileExists(file) {
  try {
    return (await fs.stat(file)).isFile();
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

function buildConsole(root) {
  const result = spawnSync('pnpm', ['objectui:build'], {
    cwd: root,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Console 构建失败，退出码：${result.status}`);
  }
}

async function validateCurrentFramework(root) {
  try {
    return await validateFrameworkRoot(root);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(
      `当前目录不是可运行的 Framework 根目录。请先 cd 到 Framework 源码目录。\n${reason}`,
    );
  }
}

export async function prepareLocal(frameworkRoot, deps = {}) {
  const validateRoot = deps.validateRoot ?? validateCurrentFramework;
  const verify = deps.verify
    ?? ((root) => verifyPackage(['--framework-root', root]));
  const consoleExists = deps.consoleExists
    ?? ((root) => fileExists(path.join(root, 'packages/console/dist/index.html')));
  const runBuild = deps.runBuild ?? buildConsole;
  const log = deps.log ?? console.log;

  const root = await validateRoot(frameworkRoot);
  log('正在检查 QA 软件包……');
  await verify(root);
  if (await consoleExists(root)) {
    return { frameworkRoot: root, consoleBuilt: false };
  }

  log('首次运行需要构建 Console，可能耗时几分钟并产生约 1.7 GB 缓存。');
  await runBuild(root);
  if (!await consoleExists(root)) {
    throw new Error('Console 构建命令已结束，但 Console 文件仍未生成。');
  }
  return { frameworkRoot: root, consoleBuilt: true };
}

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  try {
    await prepareLocal(process.cwd());
    console.log('准备完成，正在启动全新的手工导入环境……');
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
