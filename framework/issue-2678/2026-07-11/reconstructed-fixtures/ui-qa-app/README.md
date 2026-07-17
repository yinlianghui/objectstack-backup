# Issue #2678 Problem One — Copyable UI QA App

This directory is a self-contained operator package for inspecting and manually importing the reconstructed data for Issue #2678 “Problem One: bulk writes and summary calculation”. Copy this directory anywhere and point it at an **existing, installed, and built** Framework source checkout. The launcher does not clone Framework, create a Framework worktree, switch branches, or edit Framework source.

## Prerequisites

- Node.js 22 and pnpm 10.
- An existing `objectstack-ai/framework` checkout with dependencies and CLI build present.
- The bundled Console at `packages/console/dist/index.html`. If it is absent, prepare it once in the Framework checkout with `pnpm objectui:build`.

No dependency installation is required inside this package. All runs use Framework's CLI and dependencies.

## Verify the package

From this directory:

```bash
node scripts/verify-package.mjs --framework-root /path/to/framework
```

The verifier checks both compiled artifacts, the four QA objects, seed boundaries, three byte-preserved CSV fixtures, three one-sheet XLSX fixtures, expected counts and totals, artifact hashes, and forbidden transient content. When this directory is still inside the full reconstructed archive, it also checks the generated object definitions against the canonical archived source.

## Choose a mode

Each start creates a different temporary database with `--fresh`. Stop the process with `Ctrl+C`; Framework removes that run's temporary database and uploads directory on exit.

Manual mode contains the four object schemas, the app shell, and only the 11 fixed summary parents. Use it for UI imports:

```bash
node scripts/start-ui.mjs \
  --framework-root /path/to/framework \
  --mode manual \
  --port 38421
```

Seeded mode initializes every reconstructed row for immediate inspection: 1,000 seed items, 1,000 import items, 2,000 summary children, and 11 parents.

```bash
node scripts/start-ui.mjs \
  --framework-root /path/to/framework \
  --mode seeded \
  --port 38422
```

Open the URL printed by the launcher and sign in with `admin@objectos.ai` / `admin123`. Do not run both modes against the same port.

## Manual UI import

Open **Issue 2678 QA → QA Data**. Use the object's Import action and keep the direct, same-name field mapping shown below.

| Object navigation | Input file | Direct mapping |
|---|---|---|
| Import Items | `fixtures/xlsx/qa_import_item.xlsx` | `external_key`, `name`, `amount`, `active` |
| Summary Children | `fixtures/xlsx/qa_summary_child_single_parent.xlsx` | `external_key`, `name`, `parent_id`, `amount` |
| Summary Children | `fixtures/xlsx/qa_summary_child_ten_parents.xlsx` | `external_key`, `name`, `parent_id`, `amount` |

Import the two summary-child workbooks into the same fresh manual run if checking both summary distributions. The required parents already exist. The files under `fixtures/xlsx/` deliberately contain exactly one worksheet and 1,000 data rows. Equivalent byte-preserved CSV inputs are under `fixtures/csv/`.

The UI supports `.xlsx`; legacy `.xls` is intentionally not included. The multi-sheet audit workbook in the surrounding archive is human-readable evidence, not a UI import input.

## Expected values

- Every input file contains 1,000 rows with unique `external_key` values.
- Every file's `amount` total is `500500`.
- Import Items contain 500 `active=true` and 500 `active=false` rows.
- Single-parent children all reference `parent_single`; expected child count is 1,000 and expected amount total is `500500`.
- Ten-parent children are distributed round-robin: 100 rows per parent, with amount totals `49600`, `49700`, …, `50500` for `parent_01` through `parent_10`.
- The complete archived expectations, including backend batch and recomputation counts, are in `expected-results.json`.

## Evidence boundary

Successful UI import confirms that the current UI can accept the reconstructed rows and that the resulting record values can be inspected. It does **not** by itself prove internal batch-call counts, summary recomputation-call counts, or performance. Those conclusions remain backed by the archived backend harness and comparison report in the surrounding `reconstructed-fixtures` directory.

The generated object source applies two explicit current-protocol normalizations. Each historical `tenancy: { enabled: false }` declaration is compiled as `tenancy: { enabled: false, strategy: "shared" }`. Current OWD declarations are also explicit: the three independent/shared QA objects use `public_read_write`, and the master-detail child uses `controlled_by_parent`. The four historical canonical object definitions and their business fields are otherwise unchanged.

## Rebuild artifacts (maintainers only)

The package already contains compiled artifacts and import files. Rebuild only when this directory remains inside the complete `reconstructed-fixtures` archive and you are deliberately refreshing it against a prepared Framework checkout:

```bash
node scripts/build-artifacts.mjs --framework-root /path/to/framework
```

Rebuilding writes only generated files inside this package. Normal `start-ui.mjs` runs do not write here or into Framework; Framework owns only the temporary `--fresh` runtime directory.
