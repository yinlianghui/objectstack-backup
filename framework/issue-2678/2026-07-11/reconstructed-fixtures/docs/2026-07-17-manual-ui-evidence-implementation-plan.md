# Manual UI Evidence Archive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve the completed manual CSV import and summary verification as safe, directly inspectable evidence linked from the final QA report.

**Architecture:** Existing CSV fixtures remain canonical inputs. A QA-only SQLite export and a browser screenshot preserve final state without publishing authentication/session tables; README, verification records, the archive manifest, and the final report link the evidence and retain the existing performance boundary.

**Tech Stack:** SQLite CLI, Markdown, JSON, Node.js archive verifiers, SHA-256 manifests, Codex in-app browser.

## Global Constraints

- Do not duplicate the three CSV fixtures.
- Publish only the four `qa_*` database tables; exclude every `sys_*` table.
- Do not change historical backend conclusions or claim that UI verification proves internal call counts or performance.
- Preserve the unrelated untracked `ui-qa-app/fixtures/.DS_Store` without modifying or committing it.

---

### Task 1: Preserve final UI and database evidence

**Files:**
- Create: `reconstructed-fixtures/ui-qa-app/database/manual-ui-result.sqlite`
- Create: `reconstructed-fixtures/ui-qa-app/screenshots/manual-summary-parent-result.png`

**Interfaces:**
- Consumes: the completed manual fresh database and the Summary Parents browser page.
- Produces: a QA-only SQLite snapshot and a visible final-value screenshot for report links.

- [ ] **Step 1: Copy the captured task-owned evidence into the archive**

Create `ui-qa-app/database/`, then copy `/private/tmp/issue-2678-manual-ui-result.XXXXXX.sqlite` to `database/manual-ui-result.sqlite` and `/private/tmp/issue-2678-manual-summary-parent-viewport.png` to `screenshots/manual-summary-parent-result.png`.

- [ ] **Step 2: Verify the SQLite evidence boundary and values**

Run `PRAGMA integrity_check`, list all tables, and query counts, sums, and parent totals. Expected: integrity `ok`; exactly `qa_import_item`, `qa_seed_item`, `qa_summary_child`, and `qa_summary_parent`; counts 1,000 / 0 / 2,000 / 11; sums 500,500 / 1,001,000; parent totals 500,500 and 49,600 through 50,500.

- [ ] **Step 3: Verify the screenshot**

Inspect `manual-summary-parent-result.png` and confirm it visibly shows the Summary Parents table, 11-record indicator, and the persisted amount sequence without credentials or unrelated personal data.

- [ ] **Step 4: Commit the evidence files**

Stage only the SQLite and PNG files and commit with `test: preserve issue 2678 manual UI evidence`.

### Task 2: Correct operating instructions and integrate the evidence

**Files:**
- Modify: `reconstructed-fixtures/ui-qa-app/README.md`
- Modify: `reconstructed-fixtures/ui-qa-app/ui-verification.md`
- Modify: `reconstructed-fixtures/README.md`
- Modify: `reconstructed-fixtures/manifest.json`
- Modify: `final-qa-report.md`

**Interfaces:**
- Consumes: Task 1 evidence and existing CSV fixtures.
- Produces: one complete manual workflow and direct report links to every retained artifact.

- [ ] **Step 1: Expand the quick path**

Replace the four-step Import Items-only procedure with one compact sequence that imports `qa_import_item.csv`, `qa_summary_child_single_parent.csv`, and `qa_summary_child_ten_parents.csv`; state both field mappings and the exact final values.

- [ ] **Step 2: Record the completed verification**

Update `ui-verification.md` with the 2026-07-17 human CSV run, evidence database link, screenshot, exact row/sum/parent results, SQLite integrity result, and the UI-versus-backend evidence boundary.

- [ ] **Step 3: Update the overall report and archive index**

Add direct links in the archive README and the `final-qa-report.md` addendum to all three CSVs, `manual-ui-result.sqlite`, `manual-summary-parent-result.png`, and `ui-verification.md`. Explain that the SQLite file is a QA-only export that intentionally excludes runtime authentication/session tables.

- [ ] **Step 4: Register the new artifacts**

Extend `manifest.json` under the existing UI QA package metadata with the database snapshot, screenshot, manual input paths, expected counts, expected totals, and verification date.

- [ ] **Step 5: Run document checks and commit**

Run the Markdown link checker and `git diff --check`; stage only the intended Markdown/JSON files and commit with `docs: record issue 2678 manual UI verification`.

### Task 3: Refresh integrity manifests, run the full gate, and publish

**Files:**
- Modify: `reconstructed-fixtures/SHA256SUMS`
- Modify: `2026-07-11/SHA256SUMS`

**Interfaces:**
- Consumes: Tasks 1 and 2.
- Produces: verified checksums and a merged GitHub PR.

- [ ] **Step 1: Regenerate both checksum manifests**

From `framework/issue-2678/2026-07-11`, run:

```bash
node reconstructed-fixtures/source/build-sha256-manifest.mjs \
  --root reconstructed-fixtures \
  --output reconstructed-fixtures/SHA256SUMS
node reconstructed-fixtures/source/build-sha256-manifest.mjs \
  --root . --output SHA256SUMS \
  --prefix framework/issue-2678/2026-07-11
```

- [ ] **Step 2: Run the complete verification gate**

Run:

```bash
node --test reconstructed-fixtures/ui-qa-app/scripts/*.test.mjs
node reconstructed-fixtures/ui-qa-app/scripts/verify-package.mjs \
  --framework-root /Users/yinlianghui/Documents/GitHub/framework
node reconstructed-fixtures/source/verify-archive.mjs
node reconstructed-fixtures/source/check-markdown-links.mjs .
shasum -c reconstructed-fixtures/SHA256SUMS
shasum -c SHA256SUMS
git diff --check
```

Expected: 17 package tests pass; package and archive verifiers report `ok: true`; link failures are zero; both checksum manifests pass; Git whitespace check passes.

- [ ] **Step 3: Commit integrity updates**

Verify the current branch is `codex/issue-2678-ui-evidence`, stage only both checksum manifests, and commit with `chore: refresh issue 2678 evidence checksums`.

- [ ] **Step 4: Publish and merge**

Push the branch, open a ready PR to `main`, verify GitHub reports a clean merge state and green checks, merge without auto-merge, verify `origin/main` contains the merged content, and delete the remote feature branch.

- [ ] **Step 5: Clean task-owned temporary files**

After the committed artifacts are verified on `origin/main`, remove only `/private/tmp/issue-2678-manual-ui-result.XXXXXX.sqlite`, `/private/tmp/issue-2678-manual-summary-parent.png`, and `/private/tmp/issue-2678-manual-summary-parent-viewport.png`. Do not stop the user's server; tell the user they may press `Ctrl+C` after handoff.
