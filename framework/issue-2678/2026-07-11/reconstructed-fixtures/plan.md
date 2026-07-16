# Issue #2678 Reconstructed Fixtures Verification Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconstruct and independently revalidate only issue #2678 “Problem 1: bulk writes and summary recomputation” at Framework commit `98874656ffc50ce1531af52346228ffcdda73fba`, then archive durable evidence only if every historical result matches.

**Architecture:** One deterministic generator emits the CSV inputs, `expected-results.json`, and the human-readable Excel workbook from the same in-memory rows. A standalone harness loads those CSVs through the real Framework seed/import paths backed by real SQLite, wraps calls only to count invocations, and writes raw JSON plus the final database. A separate comparator enforces an exact pass gate before any evidence is copied into `objectstack-backup`.

**Tech Stack:** Node.js, pnpm, TypeScript/tsx, ObjectStack Framework at the fixed commit, real SQLite, `@oai/artifact-tool`, Git, GitHub.

## Global Constraints

- Test only Problem 1; exclude retry, bad-row, UI, cancellation, cloud, and unrelated issue coverage.
- Never modify Framework product code, Issue #2678, or its comments.
- Call wrappers may count real operations but may not simulate success or alter product behavior.
- Stop below 10 GiB free space.
- Any comparison mismatch freezes archive/commit/PR work; preserve evidence and report without changing fixtures.
- Describe the files as “a data source reconstructed from the final report and revalidated,” never as original fixtures.

## Tasks

- [x] **Task 1 — Isolated baselines and audit setup**
  - Verify both new worktrees, fixed SHAs, clean status, initial disk, tool versions, and historical SHA256 files.
  - Install Framework dependencies with a frozen lockfile and record complete stdout/stderr.

- [x] **Task 2 — Deterministic source generation**
  - Create `source/generate-fixtures.mjs` as the only producer of CSV, expected JSON, and Excel.
  - Generate 1,000 seed rows, 1,000 import rows, and single-parent/ten-parent summary rows with amounts 1–1,000.
  - Inspect values/formulas, scan formula errors, render every worksheet, and visually inspect every render.

- [x] **Task 3 — Real SQLite revalidation**
  - Create complete object definitions and `source/revalidate-problem-one.ts` outside Framework.
  - Run seed/import at batch size 200 and both summary scenarios against real SQLite.
  - Save full stdout/stderr, raw JSON, command ledger, and the post-test SQLite database.

- [x] **Task 4 — Exact comparison gate**
  - Recount records, unique keys, parent relationships, independent sums, persisted summaries, and SQLite integrity.
  - Compare all measured values with the historical report and `expected-results.json`.
  - Continue only when the comparator exits 0 with no differences.

- [x] **Task 5 — Durable archive**
  - Copy reproducible source, inputs, outputs, logs, database, environment facts, manifest, and plan to `framework/issue-2678/2026-07-11/reconstructed-fixtures/`.
  - Append a dated addendum to `final-qa-report.md`, update the parent README, and regenerate SHA256SUMS without rewriting historical conclusions.

- [ ] **Task 6 — Verification, publish, and cleanup**
  - Verify every link, file, checksum, secret scan, Git diff, branch, and archive size.
  - Commit, push, open a PR, wait for required checks, merge without auto-merge, and verify `origin/main` contains the merge.
  - Remove only this task’s worktrees, dependencies, staging copies, renders, temporary logs/databases, and processes; report disk before/after and residuals.

## Self-review

- Scope, fixed SHA, stop gate, same-source generation, real SQLite, exact historical counts, archive contents, publish flow, and cleanup are each covered once.
- No placeholders or optional acceptance criteria remain.
- The user’s explicit “execute continuously” approval selects inline execution with `superpowers:executing-plans`.
