# Manual UI Evidence Design

## Goal

Preserve the completed manual UI verification for Issue #2678 problem one so a reviewer can inspect the exact inputs, persisted QA rows, summary values, and UI result without rerunning the temporary environment.

## Evidence set

- Keep the three existing CSV inputs in `ui-qa-app/fixtures/csv/`; do not duplicate them.
- Export the four `qa_*` tables from the live fresh database into `ui-qa-app/database/manual-ui-result.sqlite`.
- Exclude all `sys_*` tables so authentication, session, and unrelated runtime data are not published.
- Save the Summary Parents page as `ui-qa-app/screenshots/manual-summary-parent-result.png`.
- Record exact counts, sums, individual parent totals, integrity status, and SHA-256 hashes in the reports.

## Documentation changes

- Expand the README quick path from the single Import Items CSV to all three manual CSV imports and their expected results.
- Update `ui-verification.md` with the completed human CSV verification, database snapshot, and screenshot.
- Update the archive README (the overall report) so all new evidence is directly linked and the evidence boundary remains explicit.
- Refresh the archive manifest and `SHA256SUMS` using the existing archive tooling.

## Verification

- Confirm the evidence database contains exactly four QA tables and passes `PRAGMA integrity_check`.
- Confirm counts and sums: import 1,000 / 500,500; seed 0; children 2,000 / 1,001,000; parents 11.
- Confirm `parent_single=500500` and `parent_01` through `parent_10=49600` through `50500`.
- Re-run the UI package verifier, archive verifier, Markdown link checker, manifest verification, and checksum verification.

## Boundary

The manual UI evidence proves file acceptance, persisted rows, and final summary values. Backend batch-call counts, summary recomputation counts, and performance remain supported by the archived backend harness and comparison report.
