# Issue #2678 补充测试证据报告

面向领导、可直接转发的结论版见：[最终测试结果报告](./final-test-report.md)。

本目录同时保留[中文测试计划](./test-plan.md)和[测试设计](./test-design.md)，以及全部必要的原始输入、运行日志、调用轨迹、测试源码和 SQLite 数据库。

## 结论先行

本次补充测试在固定 Framework 提交 `98874656ffc50ce1531af52346228ffcdda73fba` 上执行，四个必要场景全部通过：

- Seed 1,000 行：5 次引擎数组写入、5 次驱动 `bulkCreate`、0 次单行写入，1,000 行全部落库。
- Import 1,000 行：5 次引擎数组写入、5 次驱动 `bulkCreate`、0 次单行写入，创建 1,000 行、错误 0。
- 汇总单父节点：5 个子记录批次只触发 5 次父记录汇总更新，最终金额 `500500`。
- 汇总 10 个父节点：5 个批次中每批包含 10 个唯一父节点，共触发 50 次汇总更新，而不是按 1,000 条子记录更新。

这证明了原问题一“批量写入往返次数和汇总重算次数过多”的本地 SQLite 验收目标。它不证明 Turso/libSQL 云端性能，也不重新证明已经明确的重试 bug。

## 对原始两个问题的回答

### 问题一：批量写入性能慢

本次补充测试通过，回答领导提出的四个问题如下：

| 领导问题 | 回答 |
|---|---|
| 基于什么环境测试 | macOS 15.7.7、arm64、Node.js 22.14.0、pnpm 10.31.0、better-sqlite3 12.11.1、本地文件型 SQLite；Framework 固定提交 `98874656…` |
| 基本数据是什么 | 确定性生成的普通业务数据，包含唯一文本键、名称、数值和布尔值；汇总场景另外包含父子关系和金额 |
| 多少行、多少列 | Seed 1,000 行 × 4 个输入列；Import 1,000 行 × 4 个输入列；两个汇总场景各 1,000 行 × 4 个子记录输入列 |
| 测试对象是什么 | `qa_seed_item`、`qa_import_item`、`qa_summary_parent`、`qa_summary_child`；真实调用 Seed Loader、Import Runner、协议层、ObjectQL 和 SqlDriver |

普通 Seed/Import 的 4 个输入列为：

| 字段 | 类型 | 值域 |
|---|---|---|
| `external_key` | text，唯一 | `item_0000`–`item_0999` |
| `name` | text | `Evidence Item 0000`–`Evidence Item 0999` |
| `amount` | number | `1`–`1000`，总和 `500500` |
| `active` | boolean | 交替 true/false，各 500 条 |

对象逻辑上还有系统生成的 `id`，因此是 4 个输入字段、5 个逻辑落库字段。SQLite 驱动还会增加 `created_at`、`updated_at` 两个物理系统列，本报告没有把它们算作用户输入列。

汇总场景的子对象 4 个输入列为 `external_key`、`name`、`parent_id`、`amount`：

- 单父节点：1,000 条子记录全部指向 `parent_00`，金额为 `1`–`1000`，最终 `total_amount = 500500`。
- 10 个父节点：子记录按照 `i % 10` 循环分配，每个父节点 100 条；各父节点金额分别为 `49600`、`49700`、……、`50500`，合计 `500500`。
- 每个 200 行批次都覆盖全部 10 个父节点，因此预期汇总更新次数为 `5 批 × 10 个唯一父节点 = 50`，实际为 50。

所有场景都不是只核对数量：测试按照 `external_key` 排序后，将 1,000 条落库记录的全部输入字段逐行与原始输入比较，并核对首行、中间行、末行、金额合计、布尔数量及 SQLite `PRAGMA integrity_check`。

### 问题二：暂时性错误不重试，可能丢行

本次没有重复执行已经确认的失败用例，结论沿用现有 issue 证据：

- [#2804](https://github.com/objectstack-ai/framework/issues/2804)：属于原问题二的明确 bug；相关 Seed/Import 降级路径未正确重试，可能缺行。
- [#2805](https://github.com/objectstack-ai/framework/issues/2805)：属于原问题二的明确 bug；Seed 延迟引用更新失败未重试，关系可能为空但仍报告成功。
- [#2802](https://github.com/objectstack-ai/framework/issues/2802)：与原问题二有关，但属于生产代表性驱动错误分类的覆盖边界，不等同于已经确认的生产 bug。

因此，面向领导可以明确写成：“问题一的本地批量写入和汇总去重验收通过；问题二仍有 #2804、#2805 两个已确认 bug，不能写成整体通过。”

另外：

- [#2803](https://github.com/objectstack-ai/framework/issues/2803) 和 [#2806](https://github.com/objectstack-ai/framework/issues/2806) 是 PR 引入的其他正确性回归，不属于原始的性能慢或暂时性错误重试问题，应单独披露。
- 其他发现属于边缘覆盖或独立问题，不应混入“原始两个问题验收未通过”的主结论。

## 本次实际结果

| 场景 | 引擎数组写入 | 驱动批量写入 | 单行写入 | 落库/汇总结果 | 状态 |
|---|---:|---:|---:|---|---|
| Seed 1,000 行 | 5 | 5 | 0 | 1,000 行；金额 `500500`；布尔 500/500 | 通过 |
| Import 1,000 行 | 5 | 5 | 0 | created 1,000；errors 0；金额 `500500` | 通过 |
| 汇总：1 个父节点 | 5 | 5 | 0 | 父汇总更新 5 次；金额 `500500` | 通过 |
| 汇总：10 个父节点 | 5 | 5 | 0 | 父汇总更新 50 次；每父节点 100 条 | 通过 |

四个保留的 SQLite 数据库均通过 `PRAGMA integrity_check = ok`。

## 运行历史

- `run-001`：测试文件加载前失败，原因是直接运行包内 Vitest 时，上游 `metadata-protocol`/`objectql` 尚未生成 `dist`。业务场景执行数为 0，因此不是产品测试失败。原始日志、失败清单和依赖构建日志均已保留。
- `run-002`：补齐仓库标准 Turbo 上游构建前置条件后执行，1 个测试文件、4 个测试全部通过。该运行是本报告引用的有效结果。

两次运行使用不同目录，没有覆盖或删除 `run-001`。

## 证据索引

- [环境清单](./environment.json)
- [对象定义](./objects.json)
- [汇总结果索引](./results.json)
- [run-001 加载失败清单](./runs/run-001/results.json)
- [run-001 原始失败日志](./run.log)
- [run-001 依赖构建日志](./runs/run-001/dependency-build.log)
- [run-002 完整结构化结果](./runs/run-002/results.json)
- [run-002 原始测试日志](./runs/run-002/run.log)
- [run-002 调用轨迹](./traces/calls-run-002.json)
- [实际执行源码副本](./evidence.test.ts)
- [SHA-256 完整性清单](./SHA256SUMS)
- [Seed 1,000 行输入](./inputs/seed-1000x4.json)
- [Import 1,000 行输入](./inputs/import-1000x4.json)
- [单父节点汇总输入](./inputs/summary-one-parent-1000x4.json)
- [10 父节点汇总输入](./inputs/summary-ten-parent-1000x4.json)
- [Seed SQLite 数据库](./databases/run-002-seed.sqlite)
- [Import SQLite 数据库](./databases/run-002-import.sqlite)
- [单父节点汇总 SQLite 数据库](./databases/run-002-summary-one-parent.sqlite)
- [10 父节点汇总 SQLite 数据库](./databases/run-002-summary-ten-parent.sqlite)

执行源码副本与包内实际执行文件的 SHA-256 均为：

```text
a5c3fdb3b4329c6b9a4858f39b817c20bd67201058153508f0171f2fb028b055
```

## 覆盖边界

本次是补建缺失的本地可核验证据，不是重新执行完整验收。以下内容没有重跑：

- Turso/libSQL 远程数据库及真实网络错误；
- 云端网络延迟、响应丢失和幂等性；
- 50,000 行异步取消及 50,001 行上限拒绝；
- UI、HotCRM 和原完整回归套件；
- 单写与批写的绝对性能对比。

本次记录的耗时仅供识别运行，不作为云端或生产性能结论。

## 建议给领导的回复

> 我重新补了可核验的测试证据。测试基于 Framework 固定提交 `98874656…`，环境为 macOS arm64、Node.js 22.14.0、pnpm 10.31.0 和本地文件型 SQLite。
>
> 问题一是 Seed 和 Import 原来逐行写入、汇总逐行重算。补充测试分别使用 1,000 行 × 4 个输入列，字段为唯一文本键、名称、数值和布尔值；测试对象是 `qa_seed_item`、`qa_import_item`，真实经过 Seed Loader、Import Runner、协议层、ObjectQL 和 SqlDriver。两个场景实际都是 5 次引擎数组写入、5 次驱动批量写入、0 次单行写入，1,000 行全部逐字段核对通过。汇总测试使用 1,000 条四列子记录：单父节点重算 5 次，10 个父节点重算 50 次，证明重算次数受每批唯一父节点数限制，而不是受总行数限制。
>
> 问题二是暂时性错误不重试、可能丢行，目前不能写成通过。#2804、#2805 是这个问题下已经确认的 bug；#2802 是生产代表性驱动错误分类的覆盖边界。#2803、#2806 是本次 PR 发现的其他正确性回归，单独列出，不混入原始两个问题。
>
> 本次结论只针对本地 SQLite 的批量写入和汇总正确性，不代表 Turso/libSQL 云端网络与性能测试。完整输入、对象定义、调用轨迹、原始日志和四个 SQLite 数据库均已保留，可继续复核。

## 留存规则

本证据包、两个运行目录、四个数据库、依赖构建产物和专用 worktree 均不清理。只有用户后续明确要求时才能执行清理。

## 最终仓库产物清单

最终审计时执行 `git status --short --untracked-files=all`，输出如下：

```text
?? docs/superpowers/plans/2026-07-15-issue-2678-minimal-evidence.md
?? docs/superpowers/reports/issue-2678-minimal-evidence/README.md
?? docs/superpowers/reports/issue-2678-minimal-evidence/SHA256SUMS
?? docs/superpowers/reports/issue-2678-minimal-evidence/databases/run-002-import.sqlite
?? docs/superpowers/reports/issue-2678-minimal-evidence/databases/run-002-seed.sqlite
?? docs/superpowers/reports/issue-2678-minimal-evidence/databases/run-002-summary-one-parent.sqlite
?? docs/superpowers/reports/issue-2678-minimal-evidence/databases/run-002-summary-ten-parent.sqlite
?? docs/superpowers/reports/issue-2678-minimal-evidence/environment.json
?? docs/superpowers/reports/issue-2678-minimal-evidence/evidence.test.ts
?? docs/superpowers/reports/issue-2678-minimal-evidence/inputs/import-1000x4.json
?? docs/superpowers/reports/issue-2678-minimal-evidence/inputs/seed-1000x4.json
?? docs/superpowers/reports/issue-2678-minimal-evidence/inputs/summary-one-parent-1000x4.json
?? docs/superpowers/reports/issue-2678-minimal-evidence/inputs/summary-ten-parent-1000x4.json
?? docs/superpowers/reports/issue-2678-minimal-evidence/objects.json
?? docs/superpowers/reports/issue-2678-minimal-evidence/results.json
?? docs/superpowers/reports/issue-2678-minimal-evidence/runs/run-001/results.json
?? docs/superpowers/reports/issue-2678-minimal-evidence/runs/run-002/calls.json
?? docs/superpowers/reports/issue-2678-minimal-evidence/runs/run-002/results.json
?? docs/superpowers/reports/issue-2678-minimal-evidence/traces/calls-run-002.json
?? docs/superpowers/specs/2026-07-15-issue-2678-minimal-evidence-design.md
?? packages/rest/src/issue-2678-minimal-evidence.test.ts
```

`.log` 文件受仓库忽略规则影响，不显示在以上 Git 清单中，但 `run.log`、`runs/run-001/dependency-build.log` 和 `runs/run-002/run.log` 均实际存在并已纳入 SHA-256 校验。
