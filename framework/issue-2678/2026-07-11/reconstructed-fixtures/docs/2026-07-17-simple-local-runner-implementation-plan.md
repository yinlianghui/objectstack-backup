# Issue #2678 Simple Local Runner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a one-command convenience runner that prepares and starts the Issue #2678 manual UI environment from an existing Framework working directory.

**Architecture:** A small tested Node preflight module validates the current Framework checkout, verifies the QA package, and builds Console only when missing. A thin POSIX shell wrapper then `exec`s the existing `start-ui.mjs` with fixed `manual`/`38421` arguments so signal and fresh-database cleanup behavior remain unchanged.

**Tech Stack:** POSIX shell, Node.js 22 ESM, `node:test`, existing ObjectStack CLI and package verifier.

## Global Constraints

- The normal user runs only `cd <framework>` followed by `<package>/run-local.sh`.
- Never clone Framework, create/switch a worktree or branch, install dependencies, or edit Framework source.
- Build ObjectUI Console automatically only when `packages/console/dist/index.html` is missing.
- Always launch `manual` mode on port `38421` with `--fresh`.
- Preserve all existing advanced scripts and seeded-mode interfaces.
- Keep user-facing instructions in Chinese; preserve commands, object names, and field names.

## File Map

- Create `ui-qa-app/run-local.sh`: two-line user entrypoint and final `exec` into the existing launcher.
- Create `ui-qa-app/scripts/prepare-local.mjs`: testable validation, package check, and conditional Console build.
- Create `ui-qa-app/scripts/prepare-local.test.mjs`: unit tests for build/skip/failure branches.
- Modify `ui-qa-app/README.md`: put the two-command path and UI steps first; retain advanced reference later.
- Modify `ui-qa-app/ui-verification.md`: mark it as audit evidence, not an operating prerequisite.
- Modify both archive `SHA256SUMS` files after durable content is final.

---

### Task 1: Tested local preparation module

**Files:**
- Create: `ui-qa-app/scripts/prepare-local.mjs`
- Test: `ui-qa-app/scripts/prepare-local.test.mjs`

**Interfaces:**
- Produces: `prepareLocal(frameworkRoot: string, deps?: object): Promise<{ frameworkRoot: string, consoleBuilt: boolean }>`.
- Consumes: existing `validateFrameworkRoot()` and `verifyPackage()`.

- [ ] **Step 1: Write the failing tests**

Cover these exact cases with injected dependencies: existing Console skips `runBuild`; missing Console calls `runBuild` once and succeeds after the second file check; missing Console after build throws `/Console.*未生成/`; validation failure occurs before verification/build.

```js
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
    consoleExists: async () => { checks += 1; return checks === 2; },
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
    validateRoot: async () => { throw new Error('必须先进入 Framework 根目录'); },
    verify: async () => { verified = true; },
    consoleExists: async () => false,
    runBuild: () => { built = true; },
    log: () => {},
  }), /Framework 根目录/);
  assert.equal(verified, false);
  assert.equal(built, false);
});
```

- [ ] **Step 2: Run tests and confirm the module is missing**

Run: `node --test scripts/prepare-local.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `prepare-local.mjs`.

- [ ] **Step 3: Implement the preparation module**

Use real defaults while keeping the four side effects injectable:

```js
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateFrameworkRoot } from './package-lib.mjs';
import { verifyPackage } from './verify-package.mjs';

async function fileExists(file) {
  try { return (await fs.stat(file)).isFile(); } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

function buildConsole(root) {
  const result = spawnSync('pnpm', ['objectui:build'], { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Console 构建失败，退出码：${result.status}`);
}

async function validateCurrentFramework(root) {
  try {
    return await validateFrameworkRoot(root);
  } catch (error) {
    throw new Error(`当前目录不是可运行的 Framework 根目录。请先 cd 到 Framework 源码目录。\n${error.message}`);
  }
}

export async function prepareLocal(frameworkRoot, deps = {}) {
  const validateRoot = deps.validateRoot ?? validateCurrentFramework;
  const verify = deps.verify ?? ((root) => verifyPackage(['--framework-root', root]));
  const consoleExists = deps.consoleExists ?? ((root) => fileExists(path.join(root, 'packages/console/dist/index.html')));
  const runBuild = deps.runBuild ?? buildConsole;
  const log = deps.log ?? console.log;
  const root = await validateRoot(frameworkRoot);
  log('正在检查 QA 软件包……');
  await verify(root);
  if (await consoleExists(root)) return { frameworkRoot: root, consoleBuilt: false };
  log('首次运行需要构建 Console，可能耗时几分钟并产生约 1.7 GB 缓存。');
  runBuild(root);
  if (!await consoleExists(root)) throw new Error('Console 构建命令已结束，但 Console 文件仍未生成。');
  return { frameworkRoot: root, consoleBuilt: true };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    await prepareLocal(process.cwd());
    console.log('准备完成，正在启动全新的手工导入环境……');
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
```

- [ ] **Step 4: Run the focused and full script tests**

Run: `node --test scripts/prepare-local.test.mjs`

Expected: all preparation tests pass.

Run: `env FRAMEWORK_ROOT=/path/to/framework node --test scripts/*.test.mjs`

Expected: all package script tests pass.

- [ ] **Step 5: Commit Task 1**

```bash
git add framework/issue-2678/2026-07-11/reconstructed-fixtures/ui-qa-app/scripts/prepare-local.mjs \
  framework/issue-2678/2026-07-11/reconstructed-fixtures/ui-qa-app/scripts/prepare-local.test.mjs
git commit -m "feat: add issue 2678 local preparation"
```

### Task 2: Two-command shell entrypoint

**Files:**
- Create: `ui-qa-app/run-local.sh`
- Modify: `ui-qa-app/scripts/prepare-local.test.mjs`

**Interfaces:**
- Consumes: `prepare-local.mjs` and existing `start-ui.mjs`.
- Produces: an executable, argument-free `run-local.sh`.

- [ ] **Step 1: Add a failing shell contract test**

Append these imports and test to `prepare-local.test.mjs`:

```js
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('run-local shell is valid and has the fixed safe contract', async () => {
  const packageRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
  const script = path.join(packageRoot, 'run-local.sh');
  const syntax = spawnSync('sh', ['-n', script], { encoding: 'utf8' });
  assert.equal(syntax.status, 0, syntax.stderr);
  const source = await fs.readFile(script, 'utf8');
  assert.match(source, /prepare-local\.mjs/);
  assert.match(source, /exec node/);
  assert.match(source, /--mode manual/);
  assert.match(source, /--port 38421/);
  assert.doesNotMatch(source, /git clone|pnpm install|git worktree/);
});
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `node --test scripts/prepare-local.test.mjs`

Expected: FAIL because `run-local.sh` does not exist.

- [ ] **Step 3: Create the POSIX shell wrapper**

```sh
#!/bin/sh
set -eu

PACKAGE_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
FRAMEWORK_ROOT=$(pwd -P)

node "$PACKAGE_ROOT/scripts/prepare-local.mjs"
exec node "$PACKAGE_ROOT/scripts/start-ui.mjs" \
  --framework-root "$FRAMEWORK_ROOT" \
  --mode manual \
  --port 38421
```

Set executable mode with `chmod +x ui-qa-app/run-local.sh`. The preparation CLI uses `process.cwd()`, so no path argument is repeated.

- [ ] **Step 4: Run shell and package tests**

Run: `sh -n run-local.sh`

Expected: exit 0 with no output.

Run: `env FRAMEWORK_ROOT=/path/to/framework node --test scripts/*.test.mjs`

Expected: all package tests pass.

- [ ] **Step 5: Commit Task 2**

```bash
git add framework/issue-2678/2026-07-11/reconstructed-fixtures/ui-qa-app/run-local.sh \
  framework/issue-2678/2026-07-11/reconstructed-fixtures/ui-qa-app/scripts/prepare-local.test.mjs
git commit -m "feat: add issue 2678 one-command runner"
```

### Task 3: Plain-language operating guide and archive integration

**Files:**
- Modify: `ui-qa-app/README.md`
- Modify: `ui-qa-app/ui-verification.md`
- Modify: `reconstructed-fixtures/SHA256SUMS`
- Modify: `2026-07-11/SHA256SUMS`

**Interfaces:**
- Documents the argument-free `run-local.sh` from Task 2.
- Preserves existing advanced manual/seeded commands as a separate reference section.

- [ ] **Step 1: Rewrite the README opening**

The first screen must contain exactly this operating sequence before technical prerequisites:

````markdown
## 普通使用者只看这里

在终端先进入已有 Framework 源码目录，再运行本软件包的一键脚本：

```bash
cd /path/to/framework
/path/to/ui-qa-app/run-local.sh
```

脚本会自动检查软件包。第一次运行如果缺少 Console，会自动构建；随后启动全新的临时测试数据库。看到网址后使用 `admin@objectos.ai` / `admin123` 登录。
````

Immediately follow it with this exact short procedure:

```markdown
1. 打开 **Issue 2678 QA → QA Data → Import Items → Import**。
2. 选择本软件包中的 `fixtures/csv/qa_import_item.csv`。
3. 保持 `external_key`、`name`、`amount`、`active` 四个同名字段映射并提交。
4. 确认新建 1,000 条、失败 0 条。

测试完成后回到终端按 `Ctrl+C`，本次临时数据库会自动删除。
```

- [ ] **Step 2: Reduce cognitive load in the remaining docs**

Move prerequisites, direct `start-ui.mjs` commands, seeded mode, evidence boundary, and rebuild instructions under `## 进阶说明`. Do not delete technical facts. Add this note immediately below the verification title:

```markdown
> 本文件是留档用的验证证据。普通使用者无需阅读；实际操作请按 [README](../ui-qa-app/README.md) 开头的两条命令执行。
```

- [ ] **Step 3: Run verification before refreshing hashes**

Run: `node scripts/verify-package.mjs --framework-root /path/to/framework`

Expected: JSON with `ok: true`, 4 objects, 2 artifacts, 3 CSV, 3 XLSX, and 0 forbidden paths.

Run: `node reconstructed-fixtures/source/check-markdown-links.mjs .`

Expected: `ok: true` and no failures.

- [ ] **Step 4: Refresh both manifests and run the complete archive gate**

Run the inner and outer `build-sha256-manifest.mjs` commands, then run `node source/verify-archive.mjs` from `reconstructed-fixtures` and `shasum -c framework/issue-2678/2026-07-11/SHA256SUMS` from the repository root.

Expected: archive verification `ok: true`; every outer SHA-256 entry reports `OK`.

- [ ] **Step 5: Commit and publish**

Commit the README, verification note, final scripts/tests, and both manifests. Push `codex/issue-2678-simple-runner`, open a PR to `main`, merge only when GitHub reports `MERGEABLE/CLEAN`, and do not use auto-merge.

- [ ] **Step 6: Give the user the real local commands**

Use the actual local paths, not placeholders:

```bash
cd /Users/yinlianghui/Documents/GitHub/framework
/Users/yinlianghui/Documents/GitHub/objectstack-backup-issue-2678-qa-app/framework/issue-2678/2026-07-11/reconstructed-fixtures/ui-qa-app/run-local.sh
```
