# Issue #2678 最终测试结果报告

## 执行摘要（Executive Summary）

- **整体结论：部分通过，不能写成 Issue #2678 全部验收通过。** 原问题一“批量写入和汇总重算次数过多”在本地 SQLite 的 4 个必要场景全部通过；原问题二“暂时性错误不重试、可能丢行”仍有 [#2804](https://github.com/objectstack-ai/framework/issues/2804)、[#2805](https://github.com/objectstack-ai/framework/issues/2805) 两个已确认 bug。
- **问题一的证据足够回答测试环境、数据规模和测试对象。** 固定 Framework 提交 `98874656ffc50ce1531af52346228ffcdda73fba`，使用 macOS arm64、Node.js 22.14.0、pnpm 10.31.0、better-sqlite3 12.11.1；每个场景为 1,000 行 × 4 个输入列，批大小 200。
- **有效运行结果为 4/4 通过。** Seed 和 Import 均实际发出 5 次批量写入、0 次单行写入，而不是按 1,000 行发出 1,000 次写入；汇总重算分别为 5 次和 50 次，符合“每批唯一父节点数”而非“子记录行数”的限制。
- **本结论仅覆盖本地 SQLite 的批量路径与汇总正确性。** 不代表 Turso/libSQL 云端网络、远程性能、50,000 行取消、50,001 行上限或完整回归已经重新验证。

## 验收结论

| 原始问题 | 验收内容 | 最终状态 | 判断依据 |
|---|---|---|---|
| 问题一：批量写入性能慢 | Seed/Import 使用共享批量路径；约 `ceil(N/batch)` 次写入 | **通过（本地 SQLite）** | 1,000 行、批大小 200，实际均为 5 次驱动 `bulkCreate`、0 次驱动 `create` |
| 问题一：汇总逐行重算 | 汇总次数受每批唯一父节点数限制 | **通过（本地 SQLite）** | 1 个父节点：5 次；10 个父节点：50 次；均不是 1,000 次 |
| 问题二：暂时性错误不重试、可能丢行 | 重试、保留行、延迟引用更新 | **未通过** | #2804、#2805 已确认；本轮按约定不重复制造失败证据 |

因此，对领导应表述为：**问题一的本地验收通过；问题二未通过，Issue #2678 不能整体关闭为“全部验收通过”。**

## 测试环境、数据与对象

| 领导关心的问题 | 本次测试依据 |
|---|---|
| 基于什么环境 | macOS 15.7.7、arm64、Node.js 22.14.0、pnpm 10.31.0、Vitest 4.1.10、better-sqlite3 12.11.1、本地文件型 SQLite |
| 基本数据是什么 | 确定性生成的普通业务数据：唯一文本键、名称、数值、布尔值；汇总场景使用唯一文本键、名称、父节点 ID、数值 |
| 多少行、多少列 | Seed、Import、单父节点汇总、10 父节点汇总：每个场景均为 1,000 行 × 4 个输入列 |
| 测试对象是什么 | `qa_seed_item`、`qa_import_item`、`qa_summary_parent`、`qa_summary_child`；实际经过 Seed Loader、Import Runner、协议层、ObjectQL、SqlDriver |

Seed/Import 的 4 个输入列为 `external_key`、`name`、`amount`、`active`。`amount` 为 1–1,000、合计 500,500；`active` 为 true/false 各 500 行。汇总子记录的 4 个输入列为 `external_key`、`name`、`parent_id`、`amount`。

这里的“4 列”指用户输入列。系统还会生成 `id`，SQLite 驱动会维护 `created_at`、`updated_at`；这些系统列不应算作本次基础数据列。全部 1,000 行均逐字段与输入核对，并执行 SQLite 完整性检查，不是只抽查首尾样本。环境和对象定义见[环境清单](./environment.json)与[对象定义](./objects.json)。

## 有效测试结果

| 场景 | 数据规模 | 引擎数组写入 | 驱动批量写入 | 驱动单行写入 | 数据/汇总结果 | 状态 |
|---|---:|---:|---:|---:|---|---|
| Seed | 1,000 × 4 | 5 | 5 | 0 | 落库 1,000 行；金额 500,500；布尔 500/500 | 通过 |
| Import | 1,000 × 4 | 5 | 5 | 0 | created 1,000；errors 0；金额 500,500 | 通过 |
| 汇总：1 个父节点 | 1,000 × 4 | 5 | 5 | 0 | 父汇总更新 5 次；最终金额 500,500 | 通过 |
| 汇总：10 个父节点 | 1,000 × 4 | 5 | 5 | 0 | 父汇总更新 50 次；每父节点 100 行；合计 500,500 | 通过 |

这组结果证明：当 `N = 1,000`、`batch = 200` 时，Seed/Import 实际写入次数为 `ceil(1000/200) = 5`，而不是 1,000。10 父节点场景中，每个批次恰好包含 10 个唯一父节点，所以汇总更新为 `5 批 × 10 = 50`；这直接验证了汇总去重的验收标准。完整数值见 [run-002 结构化结果](./runs/run-002/results.json)和[调用轨迹](./traces/calls-run-002.json)。

## 未通过项及 Issue 归属

**明确计入原问题二未通过的只有 #2804 和 #2805：**

- [#2804](https://github.com/objectstack-ai/framework/issues/2804)：Seed/Import 的相关降级路径没有正确重试，可能缺行；属于“暂时性错误不重试、可能丢行”的直接 bug。
- [#2805](https://github.com/objectstack-ai/framework/issues/2805)：Seed 延迟引用更新失败没有重试，关系可能保持为空但仍报告成功；属于原问题二的直接 bug。

其余 Issue 不混入“原始两个问题未通过”的主结论：

- [#2802](https://github.com/objectstack-ai/framework/issues/2802) 是生产代表性驱动的错误分类/覆盖边界，与问题二相关，但作为独立覆盖项跟踪。
- [#2803](https://github.com/objectstack-ai/framework/issues/2803)、[#2806](https://github.com/objectstack-ai/framework/issues/2806) 是本次 PR 暴露的其他正确性回归，不属于原问题一或问题二。

验收标准中的“逻辑错误逐行报告、不拖垮整批”本轮没有重复执行；这不改变问题二因 #2804、#2805 已确认而整体未通过的结论。

## 建议的下一步

1. **不再重复本地批量写入证据。** 问题一已经有输入、调用次数、逐行核对结果和数据库文件，可直接复核。
2. **修复 #2804、#2805 后做针对性复验。** 只需覆盖暂时性错误重试、行不丢失、延迟引用最终正确及结果状态准确。
3. **按实际部署决定是否补 Turso/libSQL。** 如果生产使用远程 libSQL/Turso，应单列云端网络错误和性能测试；如果生产只使用本地 SQLite，则不应把云端驱动写入本次结论。
4. **#2802、#2803、#2806 分开跟踪。** 避免把生产驱动覆盖边界和其他正确性回归混成 Issue #2678 的原始验收项。

## 结论边界

本轮未重跑 Turso/libSQL 远程数据库、云端延迟/响应丢失/幂等性、50,000 行取消、50,001 行上限、UI、HotCRM、完整回归和绝对性能对比。测试记录中的毫秒耗时只用于识别一次运行，不作为云端或生产性能指标。

其中 50,000 行场景原本用于验证异步取消和资源行为，不是本次“写入次数从 N 降为约 `ceil(N/batch)`”的必要性能证据。

## 证据索引

- [中文测试计划及原计划/原报告缺口对照](./test-plan.md)
- [完整补充证据报告](./README.md)
- [有效运行的结构化结果](./runs/run-002/results.json)
- [有效运行的原始日志](./runs/run-002/run.log)
- [引擎与驱动调用轨迹](./traces/calls-run-002.json)
- [环境清单](./environment.json)与[对象定义](./objects.json)
- 输入数据：[Seed](./inputs/seed-1000x4.json)、[Import](./inputs/import-1000x4.json)、[单父节点汇总](./inputs/summary-one-parent-1000x4.json)、[10 父节点汇总](./inputs/summary-ten-parent-1000x4.json)
- 数据库：[Seed](./databases/run-002-seed.sqlite)、[Import](./databases/run-002-import.sqlite)、[单父节点汇总](./databases/run-002-summary-one-parent.sqlite)、[10 父节点汇总](./databases/run-002-summary-ten-parent.sqlite)
- [实际执行源码副本](./evidence.test.ts)与 [SHA-256 完整性清单](./SHA256SUMS)

原始输入、四个 SQLite 数据库、两次运行日志及测试源码均继续保留，未执行清理。

## 技术附录：运行记录

- `run-001` 在测试文件加载阶段失败，原因是直接运行包内 Vitest 前，上游 `metadata-protocol`、`objectql` 尚未生成构建产物；业务测试执行数为 0，所以它既不是产品测试失败，也不参与最终通过率。其[失败分类](./runs/run-001/results.json)、[原始日志](./run.log)和[依赖构建日志](./runs/run-001/dependency-build.log)均保留供审计。
- `run-002` 在补齐仓库标准的上游构建前置条件后执行：1 个测试文件、4 个测试全部通过。本文所有测试结果均来自 `run-002`，没有用第二次结果覆盖第一次记录。

报告日期：2026 年 7 月 15 日。
