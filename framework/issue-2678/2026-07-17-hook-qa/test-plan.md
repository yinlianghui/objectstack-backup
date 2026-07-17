# Framework #2678 Hook 补充 QA 测试计划

> 纯 QA：不得修改 Framework 产品代码。执行目标为 `98874656ffc50ce1531af52346228ffcdda73fba`。

## 验收矩阵

| 测试 | Hook 契约 | 写入/批次 | summary | 最终库值 | 异常 |
|---|---|---|---|---|---|
| H-NORMAL-SEED | before/after Insert 各 1,000；单记录参数 | bulkCreate 5，create 0 | 不适用 | 1,000 行及 marker | 无异常 |
| H-NORMAL-IMPORT | before/after Insert 各 1,000；单记录参数 | createMany/Engine/bulkCreate 各 5 | 不适用 | 1,000 行及 marker | 无异常 |
| H-NORMAL-SINGLE | child Insert 各 1,000；parent Update 各 5 | child bulkCreate 5 | 5 次 | 500500 | 无异常 |
| H-NORMAL-TEN | child Insert 各 1,000；parent Update 各 50 | child bulkCreate 5 | 50 次 | 49600～50500 | 无异常 |
| H-BEFORE-ERROR | before 8，after 4；均为单记录 | bulkCreate 0，create 4 | 不适用 | 4 行，坏行缺失 | 第 3 行明确失败 |
| H-AFTER-ERROR | 观察实际调用与异常点 | 记录批次及降级写入 | 不适用 | 与报告独立对账 | 不预设事务回滚结论 |

## 任务 1：固定运行时

- [x] 从 Framework 固定提交创建一次性 linked worktree，不切换共享 main。
- [x] 记录 Framework、证据仓库、Node、pnpm、系统、磁盘和依赖版本。
- [x] `pnpm install --frozen-lockfile`，构建 harness 所需的 spec/core/objectql/driver-sql/metadata-protocol/rest 依赖链。
- [x] 运行目标提交现有 Hook 与 bulk-write 专项测试作为基线。

## 任务 2：测试先行

- [x] 复制现有 5 份重建 CSV并验证逐字节哈希。
- [x] 新增两个 5 行异常 CSV；固定第 3 行为触发记录。
- [x] 先写 `expected-results.json`，包含次数、顺序、参数形状、边界、错误和最终值。
- [x] 先运行 comparison 缺失 actual 的预检，预期明确失败为 `RAW_RESULTS_MISSING`。

## 任务 3：Harness

- [x] 使用现有 `revalidate-problem-one.ts` 的真实模块加载方式，不 mock Engine/Driver 成功结果。
- [x] 使用 `engine.bindHooks` 验证 declarative record-shaped 语义；仅 H-AFTER-ERROR 使用 programmatic batch-aware Hook 强制异常。
- [x] 包装 Engine、Protocol、Driver 和 summary 方法时只记录后委托，不替换输入、输出或错误。
- [x] 每个场景使用不存在的新 SQLite 路径；拒绝覆盖旧结果库。
- [x] raw JSON 同时保存 Hook trace、方法调用、业务结果、SQLite audit 和日志。

## 任务 4：执行与比较

- [x] 执行 H-NORMAL、H-BEFORE-ERROR、H-AFTER-ERROR，分别保存完整 stdout/stderr。
- [x] comparison 对 expected 与 actual 逐项核对；已知 #2922 差异保留为失败，不改 expected 迎合实现。
- [x] 用独立 SQL 验证行数、唯一键、marker、坏行、summary、孤儿和 `PRAGMA integrity_check`。
- [x] 将 Hook、写入、summary、数据库四类结果分栏报告。

## 任务 5：归档与发布

- [x] 写 README、最终报告补充、环境、命令台账、manifest 和 SHA256SUMS。
- [x] 更新 2026-07-11 最终报告/README 的补充入口及其 SHA-256。
- [x] 校验 JSON、Markdown 链接、CSV 行数、SQLite integrity、manifest 完整性和 `shasum -c`。
- [ ] 检查 diff 只包含证据仓库材料；提交、推送、创建 PR。
- [ ] 等待远端 CI 全绿后合并；fetch 并验证 origin/main 包含 merge commit 与证据哈希。
- [ ] 删除一次性 Framework runtime worktree和其他非必要临时文件，保留已合并证据。

## 停止规则

若固定提交不匹配、真实 SQLite 无法启动、Hook 注册路径与目标实现不一致，或出现会改变“记录级 vs 批次级”判定口径的新权威裁决，则停止并询问。普通 assertion 差异属于 QA 结果，保存证据后继续。
