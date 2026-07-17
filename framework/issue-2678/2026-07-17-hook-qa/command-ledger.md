# Framework #2678 Hook 补充 QA 命令台账

每条命令独立保存 stdout/stderr，时间统一为 UTC。命令中的绝对路径仅描述本机执行位置；公开报告使用仓库相对路径。

## 001-preflight

- Started (UTC): `2026-07-17T13:58:46Z`
- Working directory: `/Users/yinlianghui/Documents/GitHub/framework`
- Command: `df -Pk .; git worktree list --porcelain; git rev-parse 98874656ffc50ce1531af52346228ffcdda73fba; test ! -e /Users/yinlianghui/Documents/GitHub/framework-issue-2678-hook-qa-runtime`
- Stdout: `commands/001-preflight.stdout.log`
- Stderr: `commands/001-preflight.stderr.log`
- Finished (UTC): `2026-07-17T13:58:47Z`
- Exit code: `0`

## 002-create-runtime-worktree

- Started (UTC): `2026-07-17T13:58:47Z`
- Working directory: `/Users/yinlianghui/Documents/GitHub/framework`
- Command: `git worktree add --detach /Users/yinlianghui/Documents/GitHub/framework-issue-2678-hook-qa-runtime 98874656ffc50ce1531af52346228ffcdda73fba`
- Stdout: `commands/002-create-runtime-worktree.stdout.log`
- Stderr: `commands/002-create-runtime-worktree.stderr.log`
- Finished (UTC): `2026-07-17T13:58:49Z`
- Exit code: `0`

## 003-runtime-git-state

- Started (UTC): `2026-07-17T13:59:01Z`
- Working directory: `/Users/yinlianghui/Documents/GitHub/framework-issue-2678-hook-qa-runtime`
- Command: `pwd; git rev-parse --git-dir; git rev-parse --git-common-dir; git branch --show-current; git rev-parse HEAD; git status --short`
- Stdout: `commands/003-runtime-git-state.stdout.log`
- Stderr: `commands/003-runtime-git-state.stderr.log`
- Finished (UTC): `2026-07-17T13:59:04Z`
- Exit code: `0`

## 004-runtime-versions

- Started (UTC): `2026-07-17T13:59:04Z`
- Working directory: `/Users/yinlianghui/Documents/GitHub/framework-issue-2678-hook-qa-runtime`
- Command: `node --version; pnpm --version; sw_vers; uname -m; system_profiler SPHardwareDataType | sed -n '1,20p'`
- Stdout: `commands/004-runtime-versions.stdout.log`
- Stderr: `commands/004-runtime-versions.stderr.log`
- Finished (UTC): `2026-07-17T13:59:10Z`
- Exit code: `0`

## 005-pnpm-install

- Started (UTC): `2026-07-17T14:01:34Z`
- Working directory: `/Users/yinlianghui/Documents/GitHub/framework-issue-2678-hook-qa-runtime`
- Command: `pnpm install --frozen-lockfile`
- Stdout: `commands/005-pnpm-install.stdout.log`
- Stderr: `commands/005-pnpm-install.stderr.log`
- Finished (UTC): `2026-07-17T14:01:58Z`
- Exit code: `0`

## 006-pnpm-build

- Started (UTC): `2026-07-17T14:02:08Z`
- Working directory: `/Users/yinlianghui/Documents/GitHub/framework-issue-2678-hook-qa-runtime`
- Command: `pnpm build`
- Stdout: `commands/006-pnpm-build.stdout.log`
- Stderr: `commands/006-pnpm-build.stderr.log`
- Finished (UTC): `2026-07-17T14:02:19Z`
- Exit code: `0`

## 007-compare-preflight

- Started (UTC): `2026-07-17T14:13:46Z`
- Working directory: `/Users/yinlianghui/Documents/GitHub/objectstack-backup-issue-2678-hook-qa/framework/issue-2678/2026-07-17-hook-qa`
- Command: `node source/compare-results.mjs --expected expected-results.json --actual results/raw-results.json --output results/comparison-report.json`
- Stdout: `commands/007-compare-preflight.stdout.log`
- Stderr: `commands/007-compare-preflight.stderr.log`
- Finished (UTC): `2026-07-17T14:13:47Z`
- Exit code: `66`

## 008-core-bulk-write-tests

- Started (UTC): `2026-07-17T14:14:59Z`
- Working directory: `/Users/yinlianghui/Documents/GitHub/framework-issue-2678-hook-qa-runtime`
- Command: `pnpm --filter @objectstack/core exec vitest run src/utils/bulk-write.test.ts`
- Stdout: `commands/008-core-bulk-write-tests.stdout.log`
- Stderr: `commands/008-core-bulk-write-tests.stderr.log`
- Finished (UTC): `2026-07-17T14:15:04Z`
- Exit code: `0`

## 009-objectql-hook-summary-tests

- Started (UTC): `2026-07-17T14:15:21Z`
- Working directory: `/Users/yinlianghui/Documents/GitHub/framework-issue-2678-hook-qa-runtime`
- Command: `pnpm --filter @objectstack/objectql exec vitest run src/hook-binder.test.ts src/hook-metrics.test.ts src/summary-rollup.test.ts`
- Stdout: `commands/009-objectql-hook-summary-tests.stdout.log`
- Stderr: `commands/009-objectql-hook-summary-tests.stderr.log`
- Finished (UTC): `2026-07-17T14:15:28Z`
- Exit code: `0`

## 010-rest-import-bulk-tests

- Started (UTC): `2026-07-17T14:15:44Z`
- Working directory: `/Users/yinlianghui/Documents/GitHub/framework-issue-2678-hook-qa-runtime`
- Command: `pnpm --filter @objectstack/rest exec vitest run src/import-runner-bulk.test.ts`
- Stdout: `commands/010-rest-import-bulk-tests.stdout.log`
- Stderr: `commands/010-rest-import-bulk-tests.stderr.log`
- Finished (UTC): `2026-07-17T14:15:47Z`
- Exit code: `0`

## 011-runtime-seed-loader-tests

- Started (UTC): `2026-07-17T14:16:05Z`
- Working directory: `/Users/yinlianghui/Documents/GitHub/framework-issue-2678-hook-qa-runtime`
- Command: `pnpm --filter @objectstack/runtime exec vitest run src/seed-loader.test.ts`
- Stdout: `commands/011-runtime-seed-loader-tests.stdout.log`
- Stderr: `commands/011-runtime-seed-loader-tests.stderr.log`
- Finished (UTC): `2026-07-17T14:16:10Z`
- Exit code: `0`

## 012-comparator-syntax

- Started (UTC): `2026-07-17T14:16:35Z`
- Working directory: `/Users/yinlianghui/Documents/GitHub/objectstack-backup-issue-2678-hook-qa/framework/issue-2678/2026-07-17-hook-qa`
- Command: `node --check source/compare-results.mjs`
- Stdout: `commands/012-comparator-syntax.stdout.log`
- Stderr: `commands/012-comparator-syntax.stderr.log`
- Finished (UTC): `2026-07-17T14:16:36Z`
- Exit code: `0`

## 013-harness-typecheck

- Started (UTC): `2026-07-17T14:17:00Z`
- Working directory: `/Users/yinlianghui/Documents/GitHub/framework-issue-2678-hook-qa-runtime`
- Command: `pnpm exec tsc --ignoreConfig --pretty false --noEmit --skipLibCheck --target ES2022 --module ESNext --moduleResolution Bundler --types node --allowImportingTsExtensions /Users/yinlianghui/Documents/GitHub/objectstack-backup-issue-2678-hook-qa/framework/issue-2678/2026-07-17-hook-qa/source/run-hook-qa.ts /Users/yinlianghui/Documents/GitHub/objectstack-backup-issue-2678-hook-qa/framework/issue-2678/2026-07-17-hook-qa/source/harness-utils.ts /Users/yinlianghui/Documents/GitHub/objectstack-backup-issue-2678-hook-qa/framework/issue-2678/2026-07-17-hook-qa/source/object-definitions.ts`
- Stdout: `commands/013-harness-typecheck.stdout.log`
- Stderr: `commands/013-harness-typecheck.stderr.log`
- Finished (UTC): `2026-07-17T14:17:03Z`
- Exit code: `0`

## 014-run-hook-qa

- Started (UTC): `2026-07-17T14:17:32Z`
- Working directory: `/Users/yinlianghui/Documents/GitHub/framework-issue-2678-hook-qa-runtime`
- Command: `pnpm exec tsx /Users/yinlianghui/Documents/GitHub/objectstack-backup-issue-2678-hook-qa/framework/issue-2678/2026-07-17-hook-qa/source/run-hook-qa.ts --framework-root /Users/yinlianghui/Documents/GitHub/framework-issue-2678-hook-qa-runtime --data-dir /Users/yinlianghui/Documents/GitHub/objectstack-backup-issue-2678-hook-qa/framework/issue-2678/2026-07-17-hook-qa/inputs --databases-dir /Users/yinlianghui/Documents/GitHub/objectstack-backup-issue-2678-hook-qa/framework/issue-2678/2026-07-17-hook-qa/databases --output /Users/yinlianghui/Documents/GitHub/objectstack-backup-issue-2678-hook-qa/framework/issue-2678/2026-07-17-hook-qa/results/raw-results.json`
- Stdout: `commands/014-run-hook-qa.stdout.log`
- Stderr: `commands/014-run-hook-qa.stderr.log`
- Finished (UTC): `2026-07-17T14:17:36Z`
- Exit code: `1`

## 015-harness-typecheck-after-esm

- Started (UTC): `2026-07-17T14:18:41Z`
- Working directory: `/Users/yinlianghui/Documents/GitHub/framework-issue-2678-hook-qa-runtime`
- Command: `pnpm exec tsc --ignoreConfig --pretty false --noEmit --skipLibCheck --target ES2022 --module ESNext --moduleResolution Bundler --types node --allowImportingTsExtensions /Users/yinlianghui/Documents/GitHub/objectstack-backup-issue-2678-hook-qa/framework/issue-2678/2026-07-17-hook-qa/source/run-hook-qa.ts /Users/yinlianghui/Documents/GitHub/objectstack-backup-issue-2678-hook-qa/framework/issue-2678/2026-07-17-hook-qa/source/harness-utils.ts /Users/yinlianghui/Documents/GitHub/objectstack-backup-issue-2678-hook-qa/framework/issue-2678/2026-07-17-hook-qa/source/object-definitions.ts`
- Stdout: `commands/015-harness-typecheck-after-esm.stdout.log`
- Stderr: `commands/015-harness-typecheck-after-esm.stderr.log`
- Finished (UTC): `2026-07-17T14:18:46Z`
- Exit code: `0`

## 016-run-hook-qa

- Started (UTC): `2026-07-17T14:19:02Z`
- Working directory: `/Users/yinlianghui/Documents/GitHub/framework-issue-2678-hook-qa-runtime`
- Command: `pnpm exec tsx /Users/yinlianghui/Documents/GitHub/objectstack-backup-issue-2678-hook-qa/framework/issue-2678/2026-07-17-hook-qa/source/run-hook-qa.ts --framework-root /Users/yinlianghui/Documents/GitHub/framework-issue-2678-hook-qa-runtime --data-dir /Users/yinlianghui/Documents/GitHub/objectstack-backup-issue-2678-hook-qa/framework/issue-2678/2026-07-17-hook-qa/inputs --databases-dir /Users/yinlianghui/Documents/GitHub/objectstack-backup-issue-2678-hook-qa/framework/issue-2678/2026-07-17-hook-qa/databases --output /Users/yinlianghui/Documents/GitHub/objectstack-backup-issue-2678-hook-qa/framework/issue-2678/2026-07-17-hook-qa/results/raw-results.json`
- Stdout: `commands/016-run-hook-qa.stdout.log`
- Stderr: `commands/016-run-hook-qa.stderr.log`
- Finished (UTC): `2026-07-17T14:19:08Z`
- Exit code: `0`

## 017-compare-results

- Started (UTC): `2026-07-17T14:19:38Z`
- Working directory: `/Users/yinlianghui/Documents/GitHub/objectstack-backup-issue-2678-hook-qa/framework/issue-2678/2026-07-17-hook-qa`
- Command: `node source/compare-results.mjs --expected expected-results.json --actual results/raw-results.json --output results/comparison-report.json`
- Stdout: `commands/017-compare-results.stdout.log`
- Stderr: `commands/017-compare-results.stderr.log`
- Finished (UTC): `2026-07-17T14:19:39Z`
- Exit code: `2`

## 018-search-afterinsert-issues

- Started (UTC): `2026-07-17T14:20:52Z`
- Working directory: `/Users/yinlianghui/Documents/GitHub/framework-issue-2678-hook-qa-runtime`
- Command: `gh issue list --repo objectstack-ai/framework --state all --limit 100 --search afterInsert bulk fallback persisted`
- Stdout: `commands/018-search-afterinsert-issues.stdout.log`
- Stderr: `commands/018-search-afterinsert-issues.stderr.log`
- Finished (UTC): `2026-07-17T14:20:54Z`
- Exit code: `1`

## 019-search-afterinsert-issues

- Started (UTC): `2026-07-17T14:21:37Z`
- Working directory: `/Users/yinlianghui/Documents/GitHub/framework-issue-2678-hook-qa-runtime`
- Command: `gh issue list --repo objectstack-ai/framework --state all --limit 100 --search "afterInsert bulk fallback persisted"`
- Stdout: `commands/019-search-afterinsert-issues.stdout.log`
- Stderr: `commands/019-search-afterinsert-issues.stderr.log`
- Finished (UTC): `2026-07-17T14:21:40Z`
- Exit code: `0`

## 020-search-afterinsert-broad

- Started (UTC): `2026-07-17T14:21:49Z`
- Working directory: `/Users/yinlianghui/Documents/GitHub/framework-issue-2678-hook-qa-runtime`
- Command: `gh issue list --repo objectstack-ai/framework --state all --limit 100 --search "afterInsert in:title,body"`
- Stdout: `commands/020-search-afterinsert-broad.stdout.log`
- Stderr: `commands/020-search-afterinsert-broad.stderr.log`
- Finished (UTC): `2026-07-17T14:21:52Z`
- Exit code: `0`

## 021-inspect-related-issues

- Started (UTC): `2026-07-17T14:22:01Z`
- Working directory: `/Users/yinlianghui/Documents/GitHub/framework-issue-2678-hook-qa-runtime`
- Command: `gh issue view 3151 --repo objectstack-ai/framework --json number,title,body,state,url,createdAt`
- Stdout: `commands/021-inspect-related-issues.stdout.log`
- Stderr: `commands/021-inspect-related-issues.stderr.log`
- Finished (UTC): `2026-07-17T14:22:04Z`
- Exit code: `0`

## 022-inspect-related-issue-3152

- Started (UTC): `2026-07-17T14:22:13Z`
- Working directory: `/Users/yinlianghui/Documents/GitHub/framework-issue-2678-hook-qa-runtime`
- Command: `gh issue view 3152 --repo objectstack-ai/framework --json number,title,body,state,url,createdAt`
- Stdout: `commands/022-inspect-related-issue-3152.stdout.log`
- Stderr: `commands/022-inspect-related-issue-3152.stderr.log`
- Finished (UTC): `2026-07-17T14:22:16Z`
- Exit code: `0`

## 024-create-afterinsert-issue

- Started (UTC): `2026-07-17T14:23:37Z`
- Working directory: `/Users/yinlianghui/Documents/GitHub/framework-issue-2678-hook-qa-runtime`
- Command: `gh issue create --repo objectstack-ai/framework --title 'bug(core,objectql): 批量写入 afterInsert 抛错后已持久化数据被 fallback 误报为失败' --body-file /Users/yinlianghui/Documents/GitHub/objectstack-backup-issue-2678-hook-qa/framework/issue-2678/2026-07-17-hook-qa/results/product-issue-afterinsert.md`
- Stdout: `commands/024-create-afterinsert-issue.stdout.log`
- Stderr: `commands/024-create-afterinsert-issue.stderr.log`
- Finished (UTC): `2026-07-17T14:23:41Z`
- Exit code: `0`

## 025-read-issue-2678

- Started (UTC): `2026-07-17T14:31:56Z`
- Working directory: `/Users/yinlianghui/Documents/GitHub/framework-issue-2678-hook-qa-runtime`
- Command: `gh issue view 2678 --repo objectstack-ai/framework --json number,title,body,state,url,closedAt,comments`
- Stdout: `commands/025-read-issue-2678.stdout.log`
- Stderr: `commands/025-read-issue-2678.stderr.log`
- Finished (UTC): `2026-07-17T14:32:01Z`
- Exit code: `0`

## 026-read-pr-2680

- Started (UTC): `2026-07-17T14:32:12Z`
- Working directory: `/Users/yinlianghui/Documents/GitHub/framework-issue-2678-hook-qa-runtime`
- Command: `gh pr view 2680 --repo objectstack-ai/framework --json number,title,body,state,url,mergeCommit,commits,files`
- Stdout: `commands/026-read-pr-2680.stdout.log`
- Stderr: `commands/026-read-pr-2680.stderr.log`
- Finished (UTC): `2026-07-17T14:32:14Z`
- Exit code: `0`

## 027-read-issue-2922

- Started (UTC): `2026-07-17T14:32:24Z`
- Working directory: `/Users/yinlianghui/Documents/GitHub/framework-issue-2678-hook-qa-runtime`
- Command: `gh issue view 2922 --repo objectstack-ai/framework --json number,title,body,state,url,closedAt,comments`
- Stdout: `commands/027-read-issue-2922.stdout.log`
- Stderr: `commands/027-read-issue-2922.stderr.log`
- Finished (UTC): `2026-07-17T14:32:27Z`
- Exit code: `0`

## 028-read-pr-2941

- Started (UTC): `2026-07-17T14:32:34Z`
- Working directory: `/Users/yinlianghui/Documents/GitHub/framework-issue-2678-hook-qa-runtime`
- Command: `gh pr view 2941 --repo objectstack-ai/framework --json number,title,body,state,url,mergeCommit,commits,files`
- Stdout: `commands/028-read-pr-2941.stdout.log`
- Stderr: `commands/028-read-pr-2941.stderr.log`
- Finished (UTC): `2026-07-17T14:32:37Z`
- Exit code: `0`

## 029-target-hook-schema

- Started (UTC): `2026-07-17T14:32:57Z`
- Working directory: `/Users/yinlianghui/Documents/GitHub/framework-issue-2678-hook-qa-runtime`
- Command: `sed -n 1,260p packages/spec/src/data/hook.zod.ts`
- Stdout: `commands/029-target-hook-schema.stdout.log`
- Stderr: `commands/029-target-hook-schema.stderr.log`
- Finished (UTC): `2026-07-17T14:32:58Z`
- Exit code: `0`

## 030-target-engine-lifecycle

- Started (UTC): `2026-07-17T14:33:10Z`
- Working directory: `/Users/yinlianghui/Documents/GitHub/framework-issue-2678-hook-qa-runtime`
- Command: `sed -n -e 1746,1792p -e 2128,2230p packages/objectql/src/engine.ts`
- Stdout: `commands/030-target-engine-lifecycle.stdout.log`
- Stderr: `commands/030-target-engine-lifecycle.stderr.log`
- Finished (UTC): `2026-07-17T14:33:11Z`
- Exit code: `0`

## 031-target-flat-input-wrapper

- Started (UTC): `2026-07-17T14:33:21Z`
- Working directory: `/Users/yinlianghui/Documents/GitHub/framework-issue-2678-hook-qa-runtime`
- Command: `sed -n 1,190p packages/objectql/src/hook-wrappers.ts`
- Stdout: `commands/031-target-flat-input-wrapper.stdout.log`
- Stderr: `commands/031-target-flat-input-wrapper.stderr.log`
- Finished (UTC): `2026-07-17T14:33:22Z`
- Exit code: `0`

## 032-target-flat-input-function

- Started (UTC): `2026-07-17T14:33:37Z`
- Working directory: `/Users/yinlianghui/Documents/GitHub/framework-issue-2678-hook-qa-runtime`
- Command: `sed -n 190,360p packages/objectql/src/hook-wrappers.ts`
- Stdout: `commands/032-target-flat-input-function.stdout.log`
- Stderr: `commands/032-target-flat-input-function.stderr.log`
- Finished (UTC): `2026-07-17T14:33:38Z`
- Exit code: `0`

## 033-input-sha256

- Started (UTC): `2026-07-17T14:35:05Z`
- Working directory: `/Users/yinlianghui/Documents/GitHub/objectstack-backup-issue-2678-hook-qa/framework/issue-2678/2026-07-17-hook-qa`
- Command: `shasum -a 256 inputs/qa_seed_item.csv inputs/qa_import_item.csv inputs/qa_summary_parents.csv inputs/qa_summary_child_single_parent.csv inputs/qa_summary_child_ten_parents.csv ../2026-07-11/reconstructed-fixtures/data/qa_seed_item.csv ../2026-07-11/reconstructed-fixtures/data/qa_import_item.csv ../2026-07-11/reconstructed-fixtures/data/qa_summary_parents.csv ../2026-07-11/reconstructed-fixtures/data/qa_summary_child_single_parent.csv ../2026-07-11/reconstructed-fixtures/data/qa_summary_child_ten_parents.csv inputs/hook-before-error.csv inputs/hook-after-error.csv`
- Stdout: `commands/033-input-sha256.stdout.log`
- Stderr: `commands/033-input-sha256.stderr.log`
- Finished (UTC): `2026-07-17T14:35:06Z`
- Exit code: `0`

## 034-sqlite-cli-version

- Started (UTC): `2026-07-17T14:35:36Z`
- Working directory: `/Users/yinlianghui/Documents/GitHub/objectstack-backup-issue-2678-hook-qa/framework/issue-2678/2026-07-17-hook-qa`
- Command: `sqlite3 --version`
- Stdout: `commands/034-sqlite-cli-version.stdout.log`
- Stderr: `commands/034-sqlite-cli-version.stderr.log`
- Finished (UTC): `2026-07-17T14:35:37Z`
- Exit code: `0`

## 035-archive-validation

- Started (UTC): `2026-07-17T14:37:06Z`
- Working directory: `/Users/yinlianghui/Documents/GitHub/objectstack-backup-issue-2678-hook-qa/framework/issue-2678/2026-07-17-hook-qa`
- Command: `./source/run-archive-validation.sh`
- Stdout: `commands/035-archive-validation.stdout.log`
- Stderr: `commands/035-archive-validation.stderr.log`
- Finished (UTC): `2026-07-17T14:37:09Z`
- Exit code: `0`

## 036-parent-markdown-links

- Started (UTC): `2026-07-17T14:37:26Z`
- Working directory: `/Users/yinlianghui/Documents/GitHub/objectstack-backup-issue-2678-hook-qa/framework/issue-2678/2026-07-17-hook-qa`
- Command: `node source/check-markdown-links.mjs ../2026-07-11`
- Stdout: `commands/036-parent-markdown-links.stdout.log`
- Stderr: `commands/036-parent-markdown-links.stderr.log`
- Finished (UTC): `2026-07-17T14:37:27Z`
- Exit code: `0`

## 037-sensitive-evidence-scan

- Started (UTC): `2026-07-17T14:38:08Z`
- Working directory: `/Users/yinlianghui/Documents/GitHub/objectstack-backup-issue-2678-hook-qa/framework/issue-2678/2026-07-17-hook-qa`
- Command: `node source/scan-sensitive-evidence.mjs .`
- Stdout: `commands/037-sensitive-evidence-scan.stdout.log`
- Stderr: `commands/037-sensitive-evidence-scan.stderr.log`
- Finished (UTC): `2026-07-17T14:38:09Z`
- Exit code: `1`

## 038-sensitive-evidence-scan

- Started (UTC): `2026-07-17T14:39:19Z`
- Working directory: `/Users/yinlianghui/Documents/GitHub/objectstack-backup-issue-2678-hook-qa/framework/issue-2678/2026-07-17-hook-qa`
- Command: `node source/scan-sensitive-evidence.mjs .`
- Stdout: `commands/038-sensitive-evidence-scan.stdout.log`
- Stderr: `commands/038-sensitive-evidence-scan.stderr.log`
- Finished (UTC): `2026-07-17T14:39:20Z`
- Exit code: `0`

## 039-git-diff-check

- Started (UTC): `2026-07-17T14:39:34Z`
- Working directory: `/Users/yinlianghui/Documents/GitHub/objectstack-backup-issue-2678-hook-qa`
- Command: `git diff --check`
- Stdout: `commands/039-git-diff-check.stdout.log`
- Stderr: `commands/039-git-diff-check.stderr.log`
- Finished (UTC): `2026-07-17T14:39:35Z`
- Exit code: `0`

## 040-framework-product-clean

- Started (UTC): `2026-07-17T14:40:01Z`
- Working directory: `/Users/yinlianghui/Documents/GitHub/framework-issue-2678-hook-qa-runtime`
- Command: `git status --short`
- Stdout: `commands/040-framework-product-clean.stdout.log`
- Stderr: `commands/040-framework-product-clean.stderr.log`
- Finished (UTC): `2026-07-17T14:40:03Z`
- Exit code: `0`

## 041-parent-sha256-check

- Started (UTC): `2026-07-17T14:42:20Z`
- Working directory: `/Users/yinlianghui/Documents/GitHub/objectstack-backup-issue-2678-hook-qa`
- Command: `shasum -a 256 -c framework/issue-2678/2026-07-11/SHA256SUMS`
- Stdout: `commands/041-parent-sha256-check.stdout.log`
- Stderr: `commands/041-parent-sha256-check.stderr.log`
- Finished (UTC): `2026-07-17T14:42:21Z`
- Exit code: `0`

## 042-final-archive-validation

- Started (UTC): `2026-07-17T14:43:20Z`
- Working directory: `/Users/yinlianghui/Documents/GitHub/objectstack-backup-issue-2678-hook-qa/framework/issue-2678/2026-07-17-hook-qa`
- Command: `./source/run-archive-validation.sh`
- Stdout: `commands/042-final-archive-validation.stdout.log`
- Stderr: `commands/042-final-archive-validation.stderr.log`
- Finished (UTC): `2026-07-17T14:43:21Z`
- Exit code: `0`
