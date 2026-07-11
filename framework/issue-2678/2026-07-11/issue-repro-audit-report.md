# #2678 Issue 可复现性审计最终报告

## 结论

- 审计范围恰好覆盖 10 个 Issue：framework #2801/#2802/#2803/#2804/#2805/#2806/#2807/#2823/#2824，以及 objectui #2393。
- 三份分组结果分别覆盖 4、2、4 个 Issue；合并后共 10 个唯一 Issue，无遗漏、无重复。
- 10 个 Issue 均达到 `ready-stable` 或 `ready-with-boundary`；不存在 `needs-comment`、`needs-minimal-rerun` 或 `blocked-environment`。
- 本轮只汇总既有独立复现结果，不再运行任何测试。各 Bug 的完整复现方法、输入、预期和实际结果以对应 Issue 正文及评论为准；本仓库仅提供补充存证，不是维护者理解或复现 Issue 的必要前提。

固定基线：Framework `98874656ffc50ce1531af52346228ffcdda73fba`；归因 baseline `21420d9f82ebdcd53a6361ded3d829723bcab18e`；ObjectUI `80901aad44ff3beeaf7882ec3367da934325b2f2`。

## 覆盖与结论汇总

| Issue | 本轮独立复现 | 最终状态 | 与 #2678 / #2680 的关系 |
|---|---|---|---|
| [framework #2801](https://github.com/objectstack-ai/framework/issues/2801) | 错误命令 1/1 失败；替代命令 1/1 成功 | `ready-stable` | #2678 审计的附带发现；#2680 前已存在，不属于 bulk-write 回归。 |
| [framework #2802](https://github.com/objectstack-ai/framework/issues/2802) | classifier 样本 1/1 | `ready-with-boundary` | #2680 新增瞬时错误 classifier 的接受范围缺口；本地成立，真实 Turso/libSQL 错误对象未测。 |
| [framework #2803](https://github.com/objectstack-ai/framework/issues/2803) | short/long/reverse/non-array 四类各 1/1 | `ready-stable` | #2680 新增 bulk batch 结果处理的类型、长度和相关性契约缺口。 |
| [framework #2804](https://github.com/objectstack-ai/framework/issues/2804) | 自引用 seed 与无 bulk protocol import 两条路径各 1/1 | `ready-with-boundary` | #2678 验收覆盖缺口；两条顺序兼容路径未纳入 #2680 的统一 retry，不宣称为相对 #2680 前语义的回归。 |
| [framework #2805](https://github.com/objectstack-ai/framework/issues/2805) | fresh SQLite 有效产品运行 1/1 | `ready-stable` | #2680 前既存；影响 #2678 seed 验收可信度，但不是 #2680 新增 bulk helper 的回归。 |
| [framework #2806](https://github.com/objectstack-ai/framework/issues/2806) | fresh SQLite 1/1 | `ready-stable` | #2680 buffering 引入的确定性本地回归：同文件新父记录在 lookup 时不可见。 |
| [framework #2807](https://github.com/objectstack-ai/framework/issues/2807) | 重复 raw header、不同源列映射同目标两类各 1/1 | `ready-stable` | #2678 审计附带的 parser/design validation gap；来自 #2771 路径，不是 #2678/#2680 回归。 |
| [framework #2823](https://github.com/objectstack-ai/framework/issues/2823) | fresh UI 栈 1/1 | `ready-stable` | #2678 UI follow-up 附带发现；与 import、bulk-write 和 #2680 独立。 |
| [framework #2824](https://github.com/objectstack-ai/framework/issues/2824) | 独立 50,000 行取消运行 1/1 | `ready-stable` | #2678 端到端验收发现的服务端取消缺口；不宣称由 #2680 引入。 |
| [objectui #2393](https://github.com/objectstack-ai/objectui/issues/2393) | 与 #2824 共享同一独立运行，1/1 | `ready-stable` | 同一次 #2678 端到端故障的前端误报边界；与 #2824 分仓库修复，不宣称由 #2680 引入。 |

上述“本轮独立复现”不计进入产品逻辑前的临时 harness 转换失败或启动诊断。#2824 与 objectui #2393 使用同一次端到端运行分别验证服务端终态和前端呈现，因此各自计 1/1，但不重复计为两次产品运行。

## 云端与归因边界

- `cloud-not-tested`：真实 Turso/libSQL 错误对象、远程提交后响应丢失、连接池、冷启动、远程绝对延迟与 HotCRM 事故环境均未验证；不得由本地结果推断云端通过。
- #2802、#2804 的本地问题已独立成立，但云端错误形态仍未测，因此为 `ready-with-boundary`。
- #2824/objectui #2393 只验证本地 SQLite 端到端行为；云端、Turso/libSQL 和外部部署环境未测。SQLite 事件循环阻塞只是待 instrumentation 的候选解释，不是已确认根因。
- 其余 Issue 为确定性本地契约、数据或导航问题，不以云端复现作为审计通过前提。

## 分组结果

- [核心写入链路审计](audit-core.md)
- [取消导入链路审计](audit-cancellation.md)
- [原有或附带问题审计](audit-peripheral.md)
- [公开证据索引](README.md)

本报告只做最终汇总；没有修改 framework/objectui，没有关闭任何 Issue，也没有替代各 Issue 中面向维护者的复现说明。
