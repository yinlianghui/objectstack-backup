# 口径来源与目标实现索引

本文件记录用于制定 `expected-results.json` 的权威来源，避免按名称猜测 Hook 行为。

| 来源 | 取证 | 用途 |
|---|---|---|
| Framework #2678 | `commands/025-read-issue-2678.stdout.log` | 确定问题一的批量写入、逻辑降级、重试和 summary 验收范围 |
| Framework PR #2680 | `commands/026-read-pr-2680.stdout.log` | 确定实现提交、归因 merge、改动文件和 per-batch summary 边界 |
| 现有最终报告 | `../2026-07-11/final-qa-report.md` | 固定历史目标 `98874656` 和既有 QA 结论 |
| 重建归档 | `../2026-07-11/reconstructed-fixtures/` | 复用 CSV、金额、批次及数据库对账口径 |
| 目标 Hook Zod 协议 | `commands/029-target-hook-schema.stdout.log` | 确定事件名、mutable input/result、session、blocking/onError 文档 |
| 目标 ObjectQL insert/summary 实现 | `commands/030-target-engine-lifecycle.stdout.log` | 确定目标提交实际用一个 array context、after Hook 后再 summary，以及父项首次出现顺序 |
| 目标 declarative wrapper | `commands/031-target-flat-input-wrapper.stdout.log`、`032-target-flat-input-function.stdout.log` | 确定 flat input proxy 对 `{data}` 的读取/写入方式，以及 array data 时具名字段失效的机制 |
| Framework #2922 | `commands/027-read-issue-2922.stdout.log` | 明确批量 array context 是产品缺陷，记录级 context 是修复方向 |
| Framework PR #2941 | `commands/028-read-pr-2941.stdout.log` | 明确正确契约为逐行 before/after、保留一次 bulkCreate，并提供后续修复 merge SHA |
| 目标现有测试 | `commands/008`～`011` | 证明目标提交相关 82 个测试通过，但没有覆盖真实批量记录级 Hook 交互 |

协议注释将 insert input 示例写作 `{doc}`，而目标引擎与 wrapper 实际使用 `{data}`。本 harness 依据真实执行形状 `{data}` 注册 Hook，同时用 #2922/#2941 确定批量时仍应是单记录 `data`；没有将注释中的字段名当成运行时别名。

`skipTriggers` 的目标协议注释明确“Lifecycle hooks still run”，因此 Seed session 断言只检查透传值，不把它作为跳过数据 Hook 的依据。后续 `skipAutomations` 修复也不属于本轮受测范围。
