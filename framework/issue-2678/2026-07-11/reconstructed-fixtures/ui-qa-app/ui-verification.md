# Issue #2678 UI QA Package — Runtime Verification

## Fixed environment

| Item | Value |
|---|---|
| Verification time | 2026-07-17 12:44 CST (Asia/Shanghai) |
| Framework commit | `afa81155fb79846978c3ba6d94876edd21658f1d` (clean before runtime) |
| Framework CLI | `@objectstack/cli/13.0.0`, invoked directly from `packages/cli/bin/run.js` |
| Bundled ObjectUI commit | `7a68d78f2a0c3c1f99dafd39b75b4f117a24917b` (`.objectui-sha`) |
| Node.js / pnpm | `v22.14.0` / `10.31.0` |
| Browser | Codex in-app Browser, background automation, new tab; no existing user tab or browser profile claimed |
| Manual artifact SHA-256 | `71274c9ccdda20cd3d991e80c801ec7392be166cc345ba4b898fc10f7d23e9b7` |
| Seeded artifact SHA-256 | `b67173ac9a0838cc455986185963dbfeb331618af22f987e7f8e5ad201aa1fe0` |

The launcher was checked for package self-pollution. It directly executes the supplied Framework checkout's CLI with `node`, starts with its working directory set to that checkout, and did not add a `packageManager` field or other runtime files to this package.

## Seeded mode (`38422`)

The seeded artifact started with a new `--fresh` OS home. Authentication used the documented fresh-run admin. Reads through `/api/v1/data/:object` produced:

| Object | Records | Independent checks |
|---|---:|---|
| `qa_import_item` | 1,000 | unique keys 1,000; amount sum 500,500; active true/false 500/500 |
| `qa_seed_item` | 1,000 | unique keys 1,000; amount sum 500,500; active true/false 500/500 |
| `qa_summary_child` | 2,000 | amount sum 1,001,000 |
| `qa_summary_parent` | 11 | persisted summaries matched independent child sums |

`parent_single` had 1,000 children and persisted `total_amount=500500`. `parent_01` through `parent_10` each had 100 children and persisted totals `49600` through `50500`, respectively.

After `SIGINT`, the fresh OS home no longer existed and no process listened on port `38422`.

## Manual mode (`38421`)

Before importing, the independent fresh run contained exactly 11 fixed parents and zero records in `qa_seed_item`, `qa_import_item`, and `qa_summary_child`.

The UI opened **Issue 2678 QA → QA Import Item → Import**. It automatically mapped all four columns with high confidence and previewed 1,000 rows. The import result reported **1,000 created**. An API read after the UI operation independently confirmed:

- record count 1,000;
- unique external keys 1,000;
- amount sum 500,500;
- active true/false 500/500;
- no browser console errors.

[UI result screenshot](screenshots/manual-table-import-result.jpg)

After `SIGINT`, the manual fresh OS home no longer existed and no process listened on port `38421`.

## XLSX boundary

The Codex in-app Browser control surface does not expose a local-file attachment API, and desktop control is intentionally blocked from operating the Codex app. Therefore this automated run did **not** claim a direct file-picker upload of the XLSX.

Instead, two separately verifiable checks were retained:

1. The exact bundled ObjectUI `parseSpreadsheetFile` implementation parsed `fixtures/xlsx/qa_import_item.xlsx` as one sheet with the four expected headers, 1,000 data rows, amount sum 500,500, and 500 true values.
2. The in-app UI import pipeline loaded the same archived rows through its supported paste path, automatically mapped the fields, created 1,000 records, and passed API reconciliation as recorded above.

This proves the XLSX bytes are accepted by the exact ObjectUI parser and that the UI mapping/write path accepts the same 1,000-row dataset. It does not overstate that the file-picker gesture itself was automated. A human acceptance check can cover that final gesture by choosing `fixtures/xlsx/qa_import_item.xlsx`; no data or mapping changes are expected.

As with any UI acceptance run, this evidence does not prove internal batch-call counts, summary recomputation-call counts, or performance. Those remain covered by the archived backend harness and comparison report.
