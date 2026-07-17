# Issue #2678 Problem One — Reconstructed Data and Revalidation

This directory preserves a **data source reconstructed from the final report and revalidated**. The original temporary fixture was deleted and is not present here. The reconstructed rows are deterministic and were tested at Framework commit `98874656ffc50ce1531af52346228ffcdda73fba` against real SQLite.

Only “Problem One: bulk writes and summary calculation” was retested. Retry, bad-row handling, cancellation, cloud behavior, and other Issue findings were intentionally excluded. A later supplementary UI package exercises import and final-value inspection for the same reconstructed rows; it does not replace the backend batch, recomputation, or performance evidence.

## Outcome

- Comparison gate: **EXACT MATCH**, 88 checks passed, 0 differences.
- Seed: 1,000 rows, five 200-row array inserts, zero single inserts.
- Import: 1,000 rows, five 200-row `createManyData` calls, zero single creates.
- Single parent: 1,000 children, five summary recomputations, stored sum `500500`.
- Ten parents: 1,000 round-robin children, 50 summary recomputations; each parent has 100 rows and stored sums `49600` through `50500`.
- Record counts, unique keys, relationships, independent database sums, persisted summaries, and SQLite `integrity_check` all passed.

The call wrappers only recorded arguments and delegated to the original product implementation. They did not simulate successful writes, replace outputs, or alter Framework behavior. No Framework product file was changed or committed.

## Primary evidence

- [Comparison report](results/comparison-report.md)
- [Machine-readable comparison](results/comparison.json)
- [Complete raw result](results/raw-results.json)
- [Post-test SQLite database](database/problem-one.sqlite)
- [Human-readable Excel workbook](data/issue-2678-reconstructed-data-source.xlsx)
- [Expected results](data/expected-results.json)
- [Object definitions](source/object-definitions.ts)
- [Complete harness](source/revalidate-problem-one.ts)
- [Generator](source/generate-fixtures.mjs)
- [Command ledger](command-ledger.md)
- [Runtime and parameters](environment/runtime.json)
- [Copyable UI QA package](ui-qa-app/README.md)
- [UI runtime verification](ui-qa-app/ui-verification.md)
- [Manual UI QA-only SQLite snapshot](ui-qa-app/database/manual-ui-result.sqlite)
- [Manual summary result screenshot](ui-qa-app/screenshots/manual-summary-parent-result.png)
- [Archive manifest](manifest.json)
- [SHA-256 manifest](SHA256SUMS)

## Copyable UI QA package

`ui-qa-app/` can be copied to another directory and run against an existing, installed, and built Framework source checkout. It never clones Framework or creates a Framework worktree. Every launch uses `--fresh`, so each scenario receives a new temporary database that is deleted on exit.

- `manual` provides the four QA objects, the UI shell, and the 11 required parent records for manual CSV/XLSX import.
- `seeded` initializes all reconstructed rows for immediate final-value inspection.

See the [package instructions](ui-qa-app/README.md) for commands and field mapping. The [runtime record](ui-qa-app/ui-verification.md) separates what was verified in the UI from the file-picker automation boundary. Internal batch-call counts, summary recomputation counts, and performance remain supported only by the backend harness and comparison report above.

On 2026-07-17, a complete human file-picker run imported the byte-preserved [`qa_import_item.csv`](ui-qa-app/fixtures/csv/qa_import_item.csv), [`qa_summary_child_single_parent.csv`](ui-qa-app/fixtures/csv/qa_summary_child_single_parent.csv), and [`qa_summary_child_ten_parents.csv`](ui-qa-app/fixtures/csv/qa_summary_child_ten_parents.csv) in one fresh manual environment. All three imports reported 1,000 creates and 0 failures. The retained [QA-only SQLite snapshot](ui-qa-app/database/manual-ui-result.sqlite) contains 1,000 import rows, 2,000 summary children, and 11 parents with `parent_single=500500` and `parent_01` through `parent_10=49600` through `50500`; `integrity_check` returned `ok`. System authentication/session tables were intentionally excluded. The [Summary Parents screenshot](ui-qa-app/screenshots/manual-summary-parent-result.png) records the corresponding UI state.

## Same-source data artifacts

`source/generate-fixtures.mjs` creates the CSV inputs, `expected-results.json`, and Excel workbook from the same in-memory rows:

- `data/qa_seed_item.csv`
- `data/qa_import_item.csv`
- `data/qa_summary_parents.csv`
- `data/qa_summary_child_single_parent.csv`
- `data/qa_summary_child_ten_parents.csv`
- `data/expected-results.json`
- `data/issue-2678-reconstructed-data-source.xlsx`

Workbook evidence includes `workbook-inspection.json`, a formula-error scan, the artifact-tool inspection stream, seven rendered worksheet images, and the render manifest. Every worksheet was visually inspected. The final workbook contains no formula error matches and every formula check reports `PASS`.

## Re-run outline

Use an isolated Framework worktree at the fixed commit and install with the frozen lockfile. Keep generated output outside this archive so the archived hashes remain stable.

```bash
git -C /path/to/framework worktree add /path/to/fresh-worktree --detach 98874656ffc50ce1531af52346228ffcdda73fba
pnpm -C /path/to/fresh-worktree install --frozen-lockfile
pnpm -C /path/to/fresh-worktree build

pnpm -C /path/to/fresh-worktree exec tsx \
  /path/to/reconstructed-fixtures/source/revalidate-problem-one.ts \
  --framework-root /path/to/fresh-worktree \
  --data-dir /path/to/reconstructed-fixtures/data \
  --database /path/to/new-output/problem-one.sqlite \
  --output /path/to/new-output/raw-results.json

node /path/to/reconstructed-fixtures/source/compare-results.mjs \
  --raw /path/to/new-output/raw-results.json \
  --expected /path/to/reconstructed-fixtures/data/expected-results.json \
  --json-output /path/to/new-output/comparison.json \
  --markdown-output /path/to/new-output/comparison-report.md
```

The database path must not already exist; the harness refuses to overwrite it. Workbook regeneration requires `@oai/artifact-tool` version `2.8.24` to be resolvable from a scratch copy of this directory. The exact generation command and bundled-runtime dependency link are recorded in command entries `019`, `021`, and `026`.

## Logs and diagnostics

`commands/` contains every recorded stdout and stderr stream through archive assembly; `command-ledger.md` records UTC timestamps, working directories, exact commands, and exit codes. Large logs are retained in full.

Two non-product execution diagnostics are intentionally preserved:

- The first workbook formula pass showed artifact-tool's `COUNTIF(range,TRUE)` returning zero for typed booleans. `source/diagnose-boolean-formulas.mjs` isolated the engine behavior; the audit formula was changed to the equivalent supported criterion `1`. Source data and expected values were unchanged.
- Command `046` failed before harness execution because staging lacked an ESM package declaration. `source/package.json` fixed module classification; command `047` proves no database/result existed, and command `048` is the sole successful product revalidation run.

The real harness logs expected best-effort lookups for absent `sys_organization` and `sys_metadata` tables in this minimal isolated schema. Those messages are caught by the product paths and did not affect the 88 comparison checks.

## Integrity and privacy

`SHA256SUMS` covers every file in this reconstructed archive except itself. Durable reports use repository-relative paths; absolute paths and the hostname retained by complete command logs are redacted without removing log lines. Credentials, tokens, dependency trees, caches, and unrelated personal information are excluded. `node_modules` and build outputs are not archived.
