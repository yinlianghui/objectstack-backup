# Issue #2678 UI QA Package Design

## Goal

Add a portable UI test shell around the existing reconstructed fixtures for Issue #2678 problem one. A user who already has a local `objectstack-ai/framework` source checkout can copy this archived package anywhere, point the launcher at that checkout, and start a clean UI environment without manually creating objects or cloning another Framework repository.

The existing backend harness remains the authoritative check for batch counts, summary recomputation counts, and database-level comparisons. The new package adds a human-operable UI path for import and final-value acceptance; it does not replace or reinterpret the archived backend evidence.

## Fixed Constraints

- The launcher requires an existing Framework source checkout supplied with `--framework-root` (or `FRAMEWORK_ROOT`).
- The launcher never clones Framework, creates a Framework worktree, changes its branch, or writes QA source files into it.
- Every test scenario starts Framework with `--fresh`, which owns a temporary `OS_HOME`, SQLite database, uploads directory, and seeded admin account. Stopping the process removes that temporary state.
- Related files within one scenario are imported during the same server run. A new scenario starts a new run and therefore a new database.
- Framework dependencies and build outputs must already be available in the supplied checkout. Missing prerequisites produce a corrective error; the launcher does not run `pnpm install` automatically.
- The archived reconstructed data remains clearly labelled as reconstructed, not the deleted original fixture.

## Chosen Shape

The package is a small ObjectStack QA application stored inside `reconstructed-fixtures/ui-qa-app/`. It contains source metadata for maintenance and precompiled artifacts for execution:

```text
ui-qa-app/
├── README.md
├── objectstack.config.ts
├── objectstack.seeded.config.ts
├── src/
│   ├── app.ts
│   ├── objects.generated.ts
│   └── seed.generated.ts
├── dist/
│   ├── manual/objectstack.json
│   ├── manual/build-provenance.json
│   ├── seeded/objectstack.json
│   └── seeded/build-provenance.json
├── fixtures/
│   ├── csv/
│   └── xlsx/
├── scripts/
│   ├── start-ui.mjs
│   ├── build-artifacts.mjs
│   └── verify-package.mjs
└── expected-results.json
```

`src/objects.generated.ts` is generated from the existing `source/object-definitions.ts`; the four QA objects are not independently retyped. Generation applies two explicit current-protocol normalizations: disabled tenancy also declares `strategy: "shared"`, and OWD is explicit (`public_read_write` for the three independent/shared objects and `controlled_by_parent` for the master-detail child). Object names, business fields, formulas, relationships, and historical source remain unchanged, and package verification rejects other drift. The build also copies the generated fixtures and expected results into `ui-qa-app/`. After that build, launching a copied `ui-qa-app/` directory uses only its own source, `dist/`, scripts, fixtures, and expected results; it does not need access to the surrounding archive. The stack declares both `ui` and `auth` capabilities so `--fresh` can seed a loginable admin and expose the Console. The app metadata contributes navigation entries for `qa_import_item`, `qa_summary_parent`, and `qa_summary_child` so the user can open the relevant lists and import wizard directly.

Two artifacts serve different purposes:

- `manual`: creates the four objects and seeds only the fixed summary parent records (`parent_single`, `parent_01` through `parent_10`). The user imports item or child fixtures through the UI.
- `seeded`: creates the same objects and automatically loads all reconstructed records. It is for quickly inspecting the initialized environment and expected final values, not for claiming that the UI import path was exercised.

The launcher interface is:

```bash
node ui-qa-app/scripts/start-ui.mjs \
  --framework-root /absolute/path/to/framework \
  --mode manual \
  --port 38421
```

`--mode` accepts `manual` or `seeded` and defaults to `manual`. The launcher resolves the matching absolute artifact path and directly invokes the supplied checkout's `packages/cli/bin/run.js` with Node and `dev --artifact ... --fresh --ui`. Direct invocation prevents a global CLI from being selected. It forwards signals so Framework performs its normal fresh-directory cleanup.

## Import Fixtures

The existing combined workbook remains a human-readable audit workbook. It has multiple worksheets and is not the manual UI import input.

The shared fixture generator will additionally emit single-sheet files that match one target object or scenario:

- `qa_import_item.csv` and `qa_import_item.xlsx`
- `qa_summary_child_single_parent.csv` and `qa_summary_child_single_parent.xlsx`
- `qa_summary_child_ten_parents.csv` and `qa_summary_child_ten_parents.xlsx`

The fixed parent records are seeded by the manual artifact, so a user does not need to import internal record IDs manually. CSV and XLSX forms are generated from the same in-memory rows and checked against the same expected-results file. Legacy `.xls` is out of scope.

## Acceptance Flow

Manual import acceptance uses one fresh run per scenario:

1. Start `manual` mode against the selected Framework checkout.
2. Sign in with the `--fresh` seeded admin.
3. Open the relevant QA object from the app navigation.
4. Import either the CSV or single-sheet XLSX fixture.
5. Verify row counts and final values in the UI and through the data API.
6. Stop the server; confirm its temporary home was removed.

Expected functional results remain:

- import item: 1,000 rows, amount sum `500500`, 500 active rows;
- single parent: 1,000 children and stored summary `500500`;
- ten parents: 100 children per parent and stored summaries `49600` through `50500`.

The UI run does not by itself prove five protocol batches, five/50 summary recomputations, or the archived millisecond measurements. Those assertions remain assigned to `source/revalidate-problem-one.ts` and its recorded outputs.

## Validation and Safety

- Validate both source stacks with the Framework CLI and compile both artifacts from a fixed, recorded Framework commit.
- Verify the artifacts contain the same four object definitions and expected parent seeds.
- Verify all generated CSV/XLSX files match the shared expected results.
- Run backend package verification and archive SHA-256 verification.
- Start both modes on random high ports with separate fresh state and shut down only the processes started by this task.
- Parse the actual XLSX with the exact bundled ObjectUI spreadsheet parser. Because the in-app Browser does not expose local-file attachment, exercise the same 1,000 rows through its supported paste import path, capture the UI result screenshot, and cross-check the data API. Preserve the boundary explicitly in `ui-qa-app/ui-verification.md` rather than claiming the file-picker gesture was automated.
- Do not commit `node_modules`, Framework build output, temporary databases, browser profiles, or transient traces.

## Non-goals

- Publishing the QA app to npm or the ObjectStack marketplace.
- Installing it into an existing persistent ObjectStack environment.
- Automatically cloning, switching, or modifying a Framework checkout.
- Re-running the full Issue #2678 QA scope beyond problem one.
- Treating the reconstructed inputs as byte-identical to the deleted original fixture.
