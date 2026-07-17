# Issue #2678 UI QA Package Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a copyable UI QA application that runs against an existing Framework source checkout, creates fresh isolated databases, and supports both automatic initialization and manual CSV/XLSX import for Issue #2678 problem one.

**Architecture:** Store source metadata, generated fixtures, two precompiled ObjectStack artifacts, a dependency-free launcher, and a verifier under `reconstructed-fixtures/ui-qa-app/`. The launcher invokes the CLI from a caller-supplied Framework checkout and never clones, switches, or writes into that checkout; `--fresh` owns and removes each test database.

**Tech Stack:** Node.js 22 ESM, `node:test`, ObjectStack CLI/artifacts, TypeScript metadata, ExcelJS resolved from the existing Framework checkout, SQLite, ObjectUI import wizard.

## Global Constraints

- Require `--framework-root <absolute path>` or `FRAMEWORK_ROOT`; never clone Framework.
- Never create, switch, or remove a Framework worktree or branch.
- Never copy QA source into Framework; temporary build staging lives under the OS temp directory.
- Require Framework dependencies/build outputs to exist; report corrective commands instead of installing automatically.
- Run every scenario with `objectstack dev --artifact ... --fresh --ui` and a caller-selected high port.
- Keep the original backend harness authoritative for batch counts, summary recomputations, and performance.
- Preserve reconstructed provenance; never describe the fixtures as the deleted original input.
- Generate CSV and single-sheet XLSX forms from the same archived rows; do not support legacy `.xls`.
- Use the Codex built-in headless browser with a new temporary profile for UI verification and show key screenshots in chat.
- Do not commit dependency trees, Framework builds, temporary databases, browser profiles, traces, or scratch logs.

## File Map

- Create `ui-qa-app/package.json`: dependency-free commands and package identity.
- Create `ui-qa-app/objectstack.config.ts`: manual-import stack.
- Create `ui-qa-app/objectstack.seeded.config.ts`: fully initialized stack.
- Create `ui-qa-app/src/app.ts`: QA app navigation.
- Create `ui-qa-app/src/objects.generated.ts`: generated copy of the canonical four object definitions.
- Create `ui-qa-app/src/seed.generated.ts`: generated parent-only and full seed arrays.
- Create `ui-qa-app/scripts/package-lib.mjs`: argument parsing, path validation, process invocation helpers.
- Create `ui-qa-app/scripts/package-lib.test.mjs`: launcher/build helper tests.
- Create `ui-qa-app/scripts/build-artifacts.mjs`: stage, compile, copy fixtures, and build XLSX inputs.
- Create `ui-qa-app/scripts/build-artifacts.test.mjs`: deterministic generation and workbook tests.
- Create `ui-qa-app/scripts/start-ui.mjs`: manual/seeded fresh launcher.
- Create `ui-qa-app/scripts/verify-package.mjs`: self-contained package verification.
- Create `ui-qa-app/fixtures/{csv,xlsx}/`: manual import files.
- Create `ui-qa-app/dist/{manual,seeded}/objectstack.json`: portable runtime artifacts.
- Create `ui-qa-app/dist/{manual,seeded}/build-provenance.json`: compile Framework SHA and artifact hash.
- Create `ui-qa-app/expected-results.json`: copied expected values.
- Create `ui-qa-app/README.md`: prerequisites, commands, import steps, expected results, and scope boundary.
- Create `ui-qa-app/screenshots/manual-xlsx-import.png`: headless-browser acceptance evidence.
- Create `ui-qa-app/ui-verification.md`: UI/API verification record and fixed Framework SHA.
- Modify `reconstructed-fixtures/README.md`: link the UI QA package and distinguish it from the backend harness.
- Modify `reconstructed-fixtures/manifest.json`: register the new package and verification evidence.
- Modify `final-qa-report.md`: link the supplementary UI package without rewriting historical results.
- Modify both `SHA256SUMS` files after all durable files are final.

---

### Task 1: Launcher contract and Framework checkout validation

**Files:**
- Create: `framework/issue-2678/2026-07-11/reconstructed-fixtures/ui-qa-app/package.json`
- Create: `framework/issue-2678/2026-07-11/reconstructed-fixtures/ui-qa-app/scripts/package-lib.mjs`
- Test: `framework/issue-2678/2026-07-11/reconstructed-fixtures/ui-qa-app/scripts/package-lib.test.mjs`

**Interfaces:**
- Produces: `parseStartArgs(argv, env)`, `artifactForMode(packageRoot, mode)`, `validateFrameworkRoot(root)`, and `frameworkCliArgs(root, args)`.

- [ ] **Step 1: Write the failing helper tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { parseStartArgs, artifactForMode, validateFrameworkRoot, frameworkCliArgs } from './package-lib.mjs';

test('parses an explicit existing-framework launch', () => {
  assert.deepEqual(parseStartArgs([
    '--framework-root', '/repo/framework', '--mode', 'seeded', '--port', '38421',
  ], {}), { frameworkRoot: '/repo/framework', mode: 'seeded', port: 38421 });
});

test('defaults to manual mode and reads FRAMEWORK_ROOT', () => {
  assert.equal(parseStartArgs(['--port', '38422'], { FRAMEWORK_ROOT: '/repo/framework' }).mode, 'manual');
});

test('rejects missing roots, invalid modes, and unsafe ports', () => {
  assert.throws(() => parseStartArgs([], {}), /framework-root/i);
  assert.throws(() => parseStartArgs(['--framework-root', '/x', '--mode', 'other'], {}), /manual.*seeded/i);
  assert.throws(() => parseStartArgs(['--framework-root', '/x', '--port', '3000'], {}), /high port/i);
});

test('resolves artifacts and CLI invocation without changing Framework', () => {
  assert.equal(artifactForMode('/pkg', 'manual'), path.join('/pkg', 'dist/manual/objectstack.json'));
  assert.deepEqual(frameworkCliArgs('/repo/framework', ['--version']).slice(-2), ['objectstack', '--version']);
});

test('rejects a directory that is not a prepared Framework checkout', async () => {
  await assert.rejects(validateFrameworkRoot('/definitely/missing'), /existing Framework/i);
});
```

- [ ] **Step 2: Run the test and confirm the module is missing**

Run: `node --test ui-qa-app/scripts/package-lib.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `package-lib.mjs`.

- [ ] **Step 3: Implement the minimal dependency-free helper module**

Implement strict flag-pair parsing, accepted modes `manual|seeded`, ports `1024..65535` excluding `3000`, absolute path normalization, and these Framework checks: `.git` exists as a file or directory, `pnpm-workspace.yaml` exists, `packages/cli/bin/run.js` exists, `packages/cli/dist/index.js` exists, and `packages/cli/node_modules` exists. Return CLI arguments beginning with `['--dir', root, '--filter', '@objectstack/cli', 'exec', 'objectstack']`.

- [ ] **Step 4: Add package commands and run the tests**

```json
{
  "name": "issue-2678-ui-qa-app",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test scripts/*.test.mjs",
    "build": "node scripts/build-artifacts.mjs",
    "start": "node scripts/start-ui.mjs",
    "verify": "node scripts/verify-package.mjs"
  }
}
```

Run: `node --test ui-qa-app/scripts/package-lib.test.mjs`

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add framework/issue-2678/2026-07-11/reconstructed-fixtures/ui-qa-app/package.json \
  framework/issue-2678/2026-07-11/reconstructed-fixtures/ui-qa-app/scripts
git commit -m "test: define issue 2678 QA launcher contract"
```

### Task 2: Self-contained metadata source and compiled artifacts

**Files:**
- Create: `ui-qa-app/objectstack.config.ts`
- Create: `ui-qa-app/objectstack.seeded.config.ts`
- Create: `ui-qa-app/src/app.ts`
- Generate: `ui-qa-app/src/objects.generated.ts`
- Generate: `ui-qa-app/src/seed.generated.ts`
- Create: `ui-qa-app/scripts/build-artifacts.mjs`
- Test: `ui-qa-app/scripts/build-artifacts.test.mjs`
- Generate: `ui-qa-app/dist/manual/objectstack.json`
- Generate: `ui-qa-app/dist/seeded/objectstack.json`

**Interfaces:**
- Consumes: `validateFrameworkRoot()` and canonical `source/object-definitions.ts` plus `data/*.csv`.
- Produces: `parseCsv(text)`, `buildSeedGroups(dataDir)`, `renderObjectsModule(source)`, and two portable artifacts.

- [ ] **Step 1: Write failing generation tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv, buildSeedGroups, renderObjectsModule } from './build-artifacts.mjs';

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
});

test('generated object source is traceable to the canonical source', async () => {
  const canonical = await fs.readFile(path.join(archiveRoot, 'source/object-definitions.ts'), 'utf8');
  const generated = renderObjectsModule(canonical);
  assert.match(generated, /GENERATED.*object-definitions\.ts/);
  assert.match(generated, /name: "qa_summary_parent"/);
  assert.match(generated, /relationshipField: "parent_id"/);
});
```

- [ ] **Step 2: Run the test and verify failure**

Run: `node --test ui-qa-app/scripts/build-artifacts.test.mjs`

Expected: FAIL because `build-artifacts.mjs` does not exist.

- [ ] **Step 3: Implement deterministic generation helpers**

`parseCsv()` must use the same quote/newline rules as the archived harness. `buildSeedGroups()` converts `amount` to number and `active` to boolean, strips `expected_*` columns from parents, and returns the five named arrays. `renderObjectsModule()` prepends a generated-file warning with the canonical relative path and otherwise preserves the canonical source exactly. Generate `seed.generated.ts` with `parentSeed` and `fullSeed`; `fullSeed` contains parent seed, `qa_seed_item`, `qa_import_item`, and one combined `qa_summary_child` dataset.

- [ ] **Step 4: Author the app and stack entry points**

```ts
// src/app.ts
export const qaApp = {
  name: 'qa_issue_2678_app', label: 'Issue 2678 QA', icon: 'flask-conical',
  navigation: [{
    id: 'qa_data', type: 'group', label: 'QA Data', icon: 'database', children: [
      { id: 'qa_import_items', type: 'object', objectName: 'qa_import_item', label: 'Import Items' },
      { id: 'qa_summary_parents', type: 'object', objectName: 'qa_summary_parent', label: 'Summary Parents' },
      { id: 'qa_summary_children', type: 'object', objectName: 'qa_summary_child', label: 'Summary Children' }
    ]
  }]
} as const;
```

Both configs call `defineStack()` with manifest id `com.objectstack.qa.issue2678`, namespace `qa`, version `1.0.0`, type `app`, `requires: ['ui', 'auth']`, the generated objects, and `[qaApp]`. The manual config uses `parentSeed`; the seeded config uses `fullSeed`.

- [ ] **Step 5: Stage and compile without writing into Framework**

In `build-artifacts.mjs`, create an OS temp directory, copy both configs and `src/`, and symlink its `node_modules` to `<framework-root>/packages/cli/node_modules`. Invoke:

```js
frameworkCliArgs(frameworkRoot, [
  'compile', stagedConfig, '--output', destinationArtifact, '--json'
]);
```

Compile manual and seeded artifacts, record the Framework SHA in each artifact's adjacent `build-provenance.json`, and always remove the staging directory in `finally`.

- [ ] **Step 6: Run tests and compile artifacts**

Run: `node --test ui-qa-app/scripts/*.test.mjs`

Expected: all helper/generation tests pass.

Run: `node ui-qa-app/scripts/build-artifacts.mjs --framework-root /Users/yinlianghui/Documents/GitHub/framework`

Expected: both CLI compiles exit 0; manual and seeded artifacts exist and list exactly four `qa_*` objects.

- [ ] **Step 7: Commit**

```bash
git add framework/issue-2678/2026-07-11/reconstructed-fixtures/ui-qa-app
git commit -m "feat: add issue 2678 QA app artifacts"
```

### Task 3: CSV/XLSX import fixtures from one source

**Files:**
- Modify: `ui-qa-app/scripts/build-artifacts.mjs`
- Modify: `ui-qa-app/scripts/build-artifacts.test.mjs`
- Generate: `ui-qa-app/fixtures/csv/qa_import_item.csv`
- Generate: `ui-qa-app/fixtures/csv/qa_summary_child_single_parent.csv`
- Generate: `ui-qa-app/fixtures/csv/qa_summary_child_ten_parents.csv`
- Generate: corresponding files under `ui-qa-app/fixtures/xlsx/`
- Generate: `ui-qa-app/expected-results.json`

**Interfaces:**
- Consumes: parsed archived CSV rows and ExcelJS resolved from `<framework-root>/packages/rest/package.json`.
- Produces: `resolveExcelJs(frameworkRoot)` and `writeSingleSheetWorkbook(ExcelJS, destination, sheetName, rows)`.

- [ ] **Step 1: Add failing workbook tests**

```js
test('writes exactly one worksheet with headers and all rows', async () => {
  const ExcelJS = await resolveExcelJs('/Users/yinlianghui/Documents/GitHub/framework');
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-xlsx-test-'));
  const file = path.join(dir, 'sample.xlsx');
  await writeSingleSheetWorkbook(ExcelJS, file, 'Import Items', [
    { external_key: 'A', name: 'One', amount: 1, active: true },
    { external_key: 'B', name: 'Two', amount: 2, active: false },
  ]);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(file);
  assert.equal(workbook.worksheets.length, 1);
  assert.equal(workbook.worksheets[0].rowCount, 3);
  assert.deepEqual(workbook.worksheets[0].getRow(1).values.slice(1),
    ['external_key', 'name', 'amount', 'active']);
  await fs.rm(dir, { recursive: true, force: true });
});
```

- [ ] **Step 2: Run the test and verify named exports are missing**

Run: `node --test ui-qa-app/scripts/build-artifacts.test.mjs`

Expected: FAIL because `resolveExcelJs` or `writeSingleSheetWorkbook` is not exported.

- [ ] **Step 3: Implement fixture copying and XLSX writing**

Resolve `exceljs` with `createRequire(<framework-root>/packages/rest/package.json)`. Copy the three archived CSV inputs byte-for-byte. Parse those copied CSV files, create one worksheet per XLSX with explicit column order, preserve numbers and booleans as typed cells, and copy `data/expected-results.json` byte-for-byte to the package root.

- [ ] **Step 4: Verify all six import files**

Add package verification assertions for exact row counts (`1000` each), exact headers, single worksheet, `amount` sum `500500`, and parent distributions (`1000` single-parent; ten groups of `100`). Also assert the combined audit workbook is absent from `ui-qa-app/fixtures/`.

Run: `node ui-qa-app/scripts/build-artifacts.mjs --framework-root /Users/yinlianghui/Documents/GitHub/framework`

Expected: three CSV and three XLSX files are generated; each XLSX contains one data sheet and 1,001 used rows including its header.

- [ ] **Step 5: Commit**

```bash
git add framework/issue-2678/2026-07-11/reconstructed-fixtures/ui-qa-app/fixtures \
  framework/issue-2678/2026-07-11/reconstructed-fixtures/ui-qa-app/expected-results.json \
  framework/issue-2678/2026-07-11/reconstructed-fixtures/ui-qa-app/scripts
git commit -m "feat: add UI-ready CSV and XLSX fixtures"
```

### Task 4: Fresh launcher, package verifier, and operator guide

**Files:**
- Create: `ui-qa-app/scripts/start-ui.mjs`
- Create: `ui-qa-app/scripts/verify-package.mjs`
- Modify: `ui-qa-app/scripts/package-lib.test.mjs`
- Create: `ui-qa-app/README.md`

**Interfaces:**
- Consumes: Task 1 helpers and Task 2/3 artifacts.
- Produces: CLI commands `node scripts/start-ui.mjs ...` and `node scripts/verify-package.mjs ...`.

- [ ] **Step 1: Add failing launcher command assertions**

```js
test('builds a fresh UI command for the selected artifact', () => {
  const args = frameworkCliArgs('/repo/framework', [
    'dev', '--artifact', '/pkg/dist/manual/objectstack.json',
    '--fresh', '--ui', '--port', '38421',
  ]);
  assert.deepEqual(args.slice(-8), [
    'dev', '--artifact', '/pkg/dist/manual/objectstack.json',
    '--fresh', '--ui', '--port', '38421',
  ]);
});
```

- [ ] **Step 2: Implement the launcher**

Parse and validate arguments, verify the selected artifact exists, print the exact Framework SHA/mode/port/artifact, then spawn `pnpm` with `frameworkCliArgs()`. Use `stdio: 'inherit'`, forward `SIGINT`/`SIGTERM` once, and exit with the child status. Do not create any directory outside Framework's own `--fresh` lifecycle.

- [ ] **Step 3: Implement the verifier**

Verify required paths, absence of forbidden directories/files, object-definition equality against the canonical source when the surrounding archive is present, artifact object/app/data counts, manual-vs-seeded seed boundaries, CSV/XLSX metrics, expected-results provenance, and both build-provenance Framework SHAs. Exit non-zero with a path-specific message on any difference.

- [ ] **Step 4: Write the operator guide**

Document prerequisites, `manual`/`seeded` commands, seeded admin credentials, separate fresh runs, exact UI navigation/import mapping, all expected values, `.xlsx` support and `.xls` exclusion, cleanup behavior, and the statement that UI acceptance does not prove internal batch/recompute/performance metrics.

- [ ] **Step 5: Verify the copyable package**

Run: `node ui-qa-app/scripts/verify-package.mjs --framework-root /Users/yinlianghui/Documents/GitHub/framework`

Expected: JSON summary with `ok: true`, four objects, two artifacts, three CSV files, three single-sheet XLSX files, and zero forbidden paths.

- [ ] **Step 6: Commit**

```bash
git add framework/issue-2678/2026-07-11/reconstructed-fixtures/ui-qa-app
git commit -m "feat: add fresh UI launcher and package verification"
```

### Task 5: Runtime smoke checks for manual and seeded modes

**Files:**
- Modify only if evidence reveals a defect: `ui-qa-app/scripts/start-ui.mjs`, configs, or generated seed source.
- Create after successful runs: `ui-qa-app/ui-verification.md`.

**Interfaces:**
- Consumes: copyable package plus prepared existing Framework checkout.
- Produces: evidence that both artifacts boot with separate fresh state and the seeded artifact holds expected data.

- [ ] **Step 1: Check UI runtime prerequisite without changing source**

Run: `test -f /Users/yinlianghui/Documents/GitHub/framework/packages/console/dist/index.html || pnpm -C /Users/yinlianghui/Documents/GitHub/framework objectui:build`

Expected: bundled Console exists. Record whether this task built it so the task can clean only its own generated output at the end.

- [ ] **Step 2: Start seeded mode on a random high port**

Run from the package directory:

```bash
node scripts/start-ui.mjs \
  --framework-root /Users/yinlianghui/Documents/GitHub/framework \
  --mode seeded --port 38422
```

Expected: banner reports the exact Framework SHA, seeded artifact, fresh OS home, seeded admin, and `http://localhost:38422/_console/`.

- [ ] **Step 3: Authenticate and audit initialized rows through HTTP**

POST `/api/v1/auth/sign-in/email` with `admin@objectos.ai` / `admin123`, use the returned `set-auth-token` as `Authorization: Bearer`, then GET each QA object with `top=2500`. Assert 1,000 import rows, 1,000 seed rows, 2,000 summary children, 11 parents, single total `500500`, and ten totals `49600..50500`.

Expected: all counts and independent sums match `expected-results.json`.

- [ ] **Step 4: Stop seeded mode and prove fresh cleanup**

Send `SIGINT` to the process started in Step 2. Assert its logged fresh OS home no longer exists and no process listens on port 38422.

- [ ] **Step 5: Start manual mode and prove independent state**

Start the same launcher with `--mode manual --port 38421`, sign in, and query the four QA objects. Assert only 11 parents exist; seed items, import items, and summary children are empty.

- [ ] **Step 6: Record immutable runtime facts**

Write `ui-verification.md` with date/timezone, Framework SHA and dirty state, ObjectUI SHA, Node/pnpm versions, ports, artifact hashes, fresh-home cleanup results, and API counts. Do not claim UI import until Task 6 completes.

- [ ] **Step 7: Commit**

```bash
git add framework/issue-2678/2026-07-11/reconstructed-fixtures/ui-qa-app
git commit -m "test: verify issue 2678 QA runtime modes"
```

### Task 6: Headless UI XLSX import acceptance

**Files:**
- Create: `ui-qa-app/screenshots/manual-xlsx-import.png`
- Modify: `ui-qa-app/ui-verification.md`
- Modify implementation only if the accepted flow exposes a package defect.

**Interfaces:**
- Consumes: manual mode on port 38421 and `fixtures/xlsx/qa_import_item.xlsx`.
- Produces: screenshot plus UI/API agreement for the 1,000-row XLSX import.

- [ ] **Step 1: Open the built-in headless browser with a new profile**

Navigate to `http://localhost:38421/_console/`, sign in as the fresh seeded admin, and open the `Issue 2678 QA` app. Do not use an existing browser profile or login state.

- [ ] **Step 2: Import the single-sheet workbook**

Open `Import Items`, launch Import, upload `ui-qa-app/fixtures/xlsx/qa_import_item.xlsx`, map `external_key`, `name`, `amount`, and `active` by matching names, choose insert mode, and submit.

Expected: the result reports 1,000 successful rows and zero failed rows.

- [ ] **Step 3: Capture and display the key result**

Capture the result page as `screenshots/manual-xlsx-import.png`; inspect it locally and show it in the task conversation. Do not retain browser profile, trace, or scratch screenshots.

- [ ] **Step 4: Cross-check through the API**

Using the same test server, query `qa_import_item` and independently assert: row count `1000`, unique `external_key` count `1000`, amount min/max `1/1000`, amount sum `500500`, and active true/false `500/500`.

- [ ] **Step 5: Update the verification record and stop the server**

Record UI result, screenshot path, API values, and the boundary that the UI run does not expose internal batch counts. Stop port 38421, assert fresh-home removal, and remove browser-owned temporary state.

- [ ] **Step 6: Commit**

```bash
git add framework/issue-2678/2026-07-11/reconstructed-fixtures/ui-qa-app/screenshots \
  framework/issue-2678/2026-07-11/reconstructed-fixtures/ui-qa-app/ui-verification.md
git commit -m "test: record issue 2678 UI import acceptance"
```

### Task 7: Copy test, archive integration, final verification, and publication

**Files:**
- Modify: `reconstructed-fixtures/README.md`
- Modify: `reconstructed-fixtures/manifest.json`
- Modify: `final-qa-report.md`
- Modify: `reconstructed-fixtures/SHA256SUMS`
- Modify: `2026-07-11/SHA256SUMS`

**Interfaces:**
- Consumes: all prior deliverables.
- Produces: a self-contained copied package, integrity manifests, durable report links, and a merged PR.

- [ ] **Step 1: Prove the subdirectory is copyable**

Copy only `ui-qa-app/` to a task-owned OS temp directory. From that copy, run its test and verifier commands and launch manual mode against `/Users/yinlianghui/Documents/GitHub/framework` on a third high port. Assert 11 parent rows and no other QA rows, stop it, then remove the exact task-owned copy.

Expected: the copied directory never reads `../source`, `../data`, or any other archive sibling at runtime.

- [ ] **Step 2: Integrate the package into durable archive documentation**

Add a README section linking `ui-qa-app/README.md`, explaining manual versus seeded mode and the existing-Framework requirement. Add `uiQaPackage` fields to `manifest.json` for path, artifact modes, import formats, UI verification record, and fixed build SHA. Add a concise link in `final-qa-report.md` without changing its historical test claims.

- [ ] **Step 3: Regenerate both checksum manifests**

```bash
node reconstructed-fixtures/source/build-sha256-manifest.mjs \
  --root reconstructed-fixtures \
  --output reconstructed-fixtures/SHA256SUMS
node reconstructed-fixtures/source/build-sha256-manifest.mjs \
  --root . --output SHA256SUMS \
  --prefix framework/issue-2678/2026-07-11
```

Run those commands from `framework/issue-2678/2026-07-11` and ensure the top-level manifest includes the nested manifest's new hash.

- [ ] **Step 4: Run the complete local gate**

Run:

```bash
node --test reconstructed-fixtures/ui-qa-app/scripts/*.test.mjs
node reconstructed-fixtures/ui-qa-app/scripts/verify-package.mjs \
  --framework-root /Users/yinlianghui/Documents/GitHub/framework
shasum -c reconstructed-fixtures/SHA256SUMS
shasum -c SHA256SUMS
node reconstructed-fixtures/source/check-markdown-links.mjs .
git diff --check
git status --short
```

Expected: all tests pass, package verifier returns `ok: true`, both checksum manifests have zero failures, Markdown link failures are empty, and only intended archive files are modified.

- [ ] **Step 5: Clean task-created external artifacts**

Remove only task-owned temp directories, browser profile/state, traces, and any Console build created in Task 5. Confirm no task process listens on the three test ports and the existing Framework checkout has the same tracked status as before this task.

- [ ] **Step 6: Commit the final archive integration**

```bash
git add framework/issue-2678/2026-07-11
git commit -m "docs: archive issue 2678 UI QA package"
git show --stat --oneline HEAD
```

- [ ] **Step 7: Push, review, and merge**

Push `codex/issue-2678-qa-app`, open a ready PR against `yinlianghui/objectstack-backup:main`, verify the PR changes only the Issue #2678 archive, wait for configured checks, and merge only when green. Never use auto-merge or force-push.

- [ ] **Step 8: Verify remote main and clean the development worktree**

Fetch `origin/main`, verify the implementation commits are ancestors of it, archive `origin/main` to a fresh task-owned temp directory, rerun checksum/link/package static verification there, then remove the temp directory, remote feature branch, local feature branch, and development worktree. Preserve the unrelated `.DS_Store` files in the original backup checkout.
