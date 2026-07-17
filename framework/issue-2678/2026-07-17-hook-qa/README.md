# Framework #2678 Problem One — Hook QA supplement

本目录是 2026-07-11 最终 QA 与重建数据归档的 Hook 补充证据。受测 Framework 固定为 `98874656ffc50ce1531af52346228ffcdda73fba`，归因提交为 #2680 merge `21420d9f82ebdcd53a6361ded3d829723bcab18e`。本补充只测试和取证，没有修改 Framework 产品代码。

## 先看结论

- [最终补充报告](final-report-supplement.md)
- [逐项比较报告](results/comparison-report.md)
- [机器可读比较](results/comparison-report.json)
- [完整 raw results 与事件 trace](results/raw-results.json)
- [post-write 异常候选问题备忘](results/product-issue-afterinsert.md)；曾未经维护者确认创建的 [Framework #3153](https://github.com/objectstack-ai/framework/issues/3153) 已关闭，不是活动 Issue

目标提交的批量写入次数、summary 重算及最终业务金额继续通过，但子记录 Hook 是每批一次 array，而不是每条记录一次 record；`beforeInsert` flat input、字段修改和逐行异常隔离因此失效。83 项分层比较为 45 passed / 38 failed。后续 #2922 / #2941 用于确定记录级契约，不作为本轮受测或通过版本。

## 归档内容

| 路径 | 内容 |
|---|---|
| `design.md` / `test-plan.md` | 受测口径、生命周期点、次数、顺序、参数和异常计划 |
| `source-references.md` | Issue、PR、协议、目标实现和现有测试的原始取证索引 |
| `inputs/` | 复用的 5 份确定性 CSV 与 2 份异常探针 CSV |
| `expected-results.json` | 运行前固定的期望值 |
| `source/` | 真实 Framework/SQLite harness、比较器、归档验证器与命令记录器 |
| `results/raw-results.json` | Hook、Engine、Protocol、Driver、summary 和 SQLite 的完整原始结果 |
| `results/comparison-report.*` | Hook、write、summary、database、order、exception 分栏比较 |
| `databases/` | 三个完成后的 fresh 最小 SQLite 数据库 |
| `commands/` / `command-ledger.md` | 每条关键命令的完整 stdout/stderr、时间、cwd 和 exit code |
| `versions-and-parameters.json` | 版本、参数、环境和数据边界 |
| `manifest.json` / `SHA256SUMS` | 文件清单和 SHA-256 |

三个数据库只含 `qa_*` 表，不含账号、会话或其他系统表，因此保留完整最小 QA 数据库。`commands/004-runtime-versions.stdout.log` 中三个主机唯一标识在归档前显式替换为 `[REDACTED]`；OS、CPU、内存、Node 和 pnpm 信息保留。

## Issue 候选流程

本备忘仓库中的候选问题遵循“一项一文件”：先保存证据、复现、影响、边界、去重结果和建议 Issue 文案，状态保持为“待维护者确认”。只有维护者明确批准后才创建正式 Issue，并在候选文件中回填链接和状态。未经确认不得创建、重开或更新外部 Issue。

`results/product-issue-afterinsert.md` 是本轮唯一需要维护者判断是否上报的候选文件。#3153 的链接只保留为历史操作记录；该 Issue 已由维护者关闭，不表示候选项已获批准。

## 从固定 Framework 版本复跑

以下命令在一个已安装、已 build 且 HEAD 为固定 SHA 的 Framework worktree 中运行。harness 会拒绝覆盖现有输出，建议用临时目录：

```bash
QA_RERUN_DIR=$(mktemp -d)
pnpm exec tsx /absolute/path/to/2026-07-17-hook-qa/source/run-hook-qa.ts \
  --framework-root /absolute/path/to/framework-at-98874656 \
  --data-dir /absolute/path/to/2026-07-17-hook-qa/inputs \
  --databases-dir "$QA_RERUN_DIR/databases" \
  --output "$QA_RERUN_DIR/raw-results.json"
node /absolute/path/to/2026-07-17-hook-qa/source/compare-results.mjs \
  --expected /absolute/path/to/2026-07-17-hook-qa/expected-results.json \
  --actual "$QA_RERUN_DIR/raw-results.json" \
  --output "$QA_RERUN_DIR/comparison-report.json"
```

在该历史目标上，第二条命令预期退出码为 `2`，因为它成功检测到已知记录级 Hook 不兼容和异常一致性差异；退出码 `2` 不是 harness 启动失败。完整原始执行见命令 `016-run-hook-qa`，比较见 `017-compare-results`。

## 证据边界

本归档只支持固定历史 Framework、本地真实 SQLite、batch size 200 和所列输入。它不证明后续 #2941 修复、当前 main、ObjectUI、云端、Turso/libSQL、其他驱动、事务模式、远程可靠性或性能；包装器计数也不是性能测量。
