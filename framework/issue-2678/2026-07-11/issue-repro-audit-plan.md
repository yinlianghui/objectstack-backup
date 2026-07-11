# #2678 Issue 可复现性审计执行计划

> **执行要求：** 每个新 Chat 必须使用 `superpowers:executing-plans`，只执行分配给自己的审计组；不得修复产品代码。

**目标：** 审计 #2678 QA 产生的 10 个 Issue，确认每个问题的复现规则独立、清楚、稳定，并在证据不足时执行最小补测。

**方法：** 使用一份统一计划和三份分组结果文件。先审阅 Issue、报告、截图和现有 2/2 证据；仅当统一审计标准未满足时才启动最小复现。三个执行 Chat 完成后，由第四个 Chat 汇总并决定能否关闭本轮 QA。

**证据仓库：** `yinlianghui/objectstack-backup`

## 固定输入

- Framework baseline：`98874656ffc50ce1531af52346228ffcdda73fba`
- Attribution baseline：`21420d9f82ebdcd53a6361ded3d829723bcab18e`
- ObjectUI pin：`80901aad44ff3beeaf7882ec3367da934325b2f2`
- 原始 Issue：`objectstack-ai/framework#2678`
- 原始 PR：`objectstack-ai/framework#2680`
- 测试计划：`framework/issue-2678/2026-07-11/test-plan.md`
- 执行报告：`framework/issue-2678/2026-07-11/qa-report.md`
- 截图索引：`framework/issue-2678/2026-07-11/README.md`

## 输出文件

- 审计组 A：`framework/issue-2678/2026-07-11/audit-core.md`
- 审计组 B：`framework/issue-2678/2026-07-11/audit-cancellation.md`
- 审计组 C：`framework/issue-2678/2026-07-11/audit-peripheral.md`
- 最终汇总：`framework/issue-2678/2026-07-11/issue-repro-audit-report.md`

## 全局约束

- 只测试、审计和记录；不得修改 framework 或 objectui 产品/测试代码。
- 不关闭 Issue，不修改 Issue 正文，不调整标签、负责人或优先级。
- 描述不足时仅追加一条结构化评论；已有内容充分时不得重复评论。
- 已有两次独立复现且证据一致时，不为“确认一次”而重复运行测试。
- 只有审计项缺失、证据互相矛盾或第三方无法按步骤复现时，才允许最小补测。
- 云端不可用不阻塞本地审计；必须明确写成 `cloud-not-tested`，不得推断通过。
- 不加入随机 sleep；等待必须对应可观测状态或明确超时。
- 不创建新 worktree；只读检查现有 framework/objectui checkout。
- 如需启动服务，必须使用任务专属端口/进程并在当前 Chat 结束前关闭。
- 不提交任何修复；只允许更新 `objectstack-backup` 中的审计文档并推送。
- 聊天过程极简输出；命令、证据和结论写入对应结果文件，不在聊天重复粘贴。

## 统一审计标准

每个 Issue 必须逐项给出 `yes`、`no` 或 `not-applicable`：

1. **Identity**：仓库、Issue 编号、问题标题明确。
2. **Baseline**：Framework/ObjectUI 适用版本明确。
3. **Preconditions**：环境、对象、数据状态和必要配置明确。
4. **Fixture**：输入规模、关键字段、唯一名称策略或生成规则明确。
5. **Steps**：第三方能够按顺序执行，不依赖本 Chat 隐含状态。
6. **Expected**：成功判定或正确行为明确。
7. **Actual**：失败表现、错误文本、计数或终态明确。
8. **Stability**：复现次数及每轮是否使用独立数据明确。
9. **Evidence**：日志、API、SQLite、截图或源码边界至少一种可访问。
10. **Boundary**：是否由 #2680 引入、是否原有、是否附带发现、哪些云端内容未测明确。

## 最终状态

- `ready-stable`：10 项全部满足或合理为 `not-applicable`，且至少 2/2 稳定复现。
- `ready-with-boundary`：本地复现稳定，但云端或特定外部环境明确未测。
- `needs-comment`：现有证据充分，但 Issue 缺少一项或多项文字说明；追加评论即可完成。
- `needs-minimal-rerun`：现有证据冲突、只有一次复现，或无法确认精确判定条件。
- `blocked-environment`：最小复现必需条件本地不可提供；列入未测试清单。
- `not-a-bug-risk`：仅为风险或设计讨论，不得冒充已确认 Bug。

`ready-stable` 与 `ready-with-boundary` 视为审计通过。其他状态必须在最终报告中保留具体缺口。

## 结果文件模板

每份分组结果文件必须包含：

```markdown
# 审计组 X 结果

## 环境与证据
- 审计时间：
- 固定 baseline：
- 是否启动服务：否/是（端口、PID、清理结果）

| Issue | Identity | Baseline | Preconditions | Fixture | Steps | Expected | Actual | Stability | Evidence | Boundary | 最终状态 |
|---|---|---|---|---|---|---|---|---|---|---|---|

## 补充动作
- 追加评论：链接或“无”
- 最小复现：命令、轮次、结果或“未触发”

## 未解决缺口
- 无，或逐项列出
```

## Task 0：每个执行 Chat 的共同预检

- [ ] 读取本计划、完整执行报告和证据索引。
- [ ] 使用 `gh issue view` 读取本组每个 Issue 的正文和全部评论。
- [ ] 核对 Issue 仍为 open；若状态变化，只记录，不擅自恢复或关闭。
- [ ] 读取相关源码只能用于确认边界，不得产生本地产品代码 diff。
- [ ] 先填写 10 项审计矩阵，再决定是否需要评论或最小复现。
- [ ] 若需要评论，先查重；同一缺口只追加一次。
- [ ] 若需要最小复现，先写清触发原因、最小输入和停止条件。
- [ ] 完成后确认服务已停止、产品仓库无新增 diff，并写入分组结果文件。

## Task 1：审计组 A — #2680 核心写入链路

**Issue：** framework #2802、#2803、#2804、#2806  
**输出：** `audit-core.md`

### 关系边界

- #2802：#2680 新增瞬时错误 classifier 的接受范围。
- #2803：#2680 bulk batch 返回结果的长度、顺序和类型契约。
- #2804：自引用 seed 顺序路径与无 bulk protocol 兼容路径共用的 retry 缺口。
- #2806：#2680 import 缓冲写入导致同文件新父记录在 lookup 时不可见。

### 审计步骤

- [ ] 对四个 Issue 分别填写 10 项审计矩阵，不能以“同组”代替逐项判断。
- [ ] 核对 #2802 的瞬时/逻辑错误样本、2/2 结果和错误分类边界。
- [ ] 核对 #2803 的 short、long、reverse、non-array 四类响应及安全拒绝标准。
- [ ] 核对 #2804 正文是否同时覆盖两个兼容路径，并说明为何归入同一 retry 根因。
- [ ] 核对 #2806 的 UI/API/SQLite 三层证据及“已有父项成功、同文件新父项失败”的对照规则。
- [ ] 只有某个响应类型、路径或复现轮次在 Issue 与报告之间冲突时，才触发对应最小复现。
- [ ] 若缺少版本、命令或判定标准，向对应 Issue 追加一条结构化评论并记录链接。
- [ ] 写入 `audit-core.md`，不得在该文件讨论取消导入或附带 UI 导航问题。

### 停止条件

- 发现需要修代码才能继续：记录缺口并停止该 Issue，不实施修复。
- 最小复现连续两轮与既有证据相反：状态改为 `needs-minimal-rerun`，不得继续扩大样本掩盖矛盾。
- 需要真实 Turso/libSQL 才能判断：标记 `ready-with-boundary` 或 `blocked-environment`，取决于本地 Bug 是否已经独立成立。

## Task 2：审计组 B — 取消导入端到端链路

**Issue：** framework #2824、objectui #2393  
**输出：** `audit-cancellation.md`

### 关系边界

- #2824：服务端 running job 实际未停止，最终为 `succeeded/50000/50000`。
- objectui #2393：前端在服务端未确认 cancelled 时仍显示“已取消 / 0 条”。
- 两者源于同一次端到端故障，但属于不同仓库和修复边界，不得合并 Issue。

### 审计步骤

- [ ] 核对两次运行是否使用独立数据前缀、50,000 条有效记录和全新后端。
- [ ] 核对取消时机：任务为 running、0/50,000、唯一取消控件可见。
- [ ] 核对严格成功标准：终态必须为 `cancelled` 且业务记录未达到完整输入数。
- [ ] 核对后端证据链：UI、导入历史、`sys_import_job`、业务表四方是否一致指向实际成功。
- [ ] 核对前端证据链：即时 cancelled/0 与最终 succeeded/50,000 的矛盾是否清楚。
- [ ] 核对 #2824 未把“SQLite 阻塞事件循环”写成已确认根因，只能保留为待 instrumentation 的边界。
- [ ] 现有 2/2 和三张截图完整时不得再次运行 50,000 行任务。
- [ ] 仅当 Issue 缺少严格终态判定或两仓库关系说明时追加评论。
- [ ] 写入 `audit-cancellation.md`，分别给出两个 Issue 的最终状态。

### 停止条件

- 不允许为了得到更多截图重复 50,000 行导入。
- 精确事件循环归因需要临时日志或代码 instrumentation：记录为修复阶段工作，不在审计阶段执行。
- 截图公开链接失效：先修复证据归档，不重新运行产品场景。

## Task 3：审计组 C — 原有或附带问题

**Issue：** framework #2801、#2805、#2807、#2823  
**输出：** `audit-peripheral.md`

### 关系边界

- #2801：文档化 dev 命令与 CLI 参数转发不一致，#2680 前既存。
- #2805：deferred seed update 错误被吞掉，#2680 前既存但影响验收可信度。
- #2807：重复 effective CSV header 静默 last-wins，属于 parser/design gap。
- #2823：Showcase Capability Map 相对链接错误，与导入功能独立。

### 审计步骤

- [ ] 核对 #2801 的错误命令、替代可用命令、exit code 和 2/2 结果。
- [ ] 核对 #2805 的 deferred pass-2 失败、返回 success、未报告失败和 2/2 结果。
- [ ] 核对 #2807 的同名列与不同列映射到同目标两类输入，确认 design-gap 分类没有冒充 #2680 回归。
- [ ] 核对 #2823 的起始 URL、实际嵌套 URL、预期根路径和 2/2 截图证据。
- [ ] 四个 Issue 必须分别说明为何不属于 #2678 核心回归，不能只写“附带发现”。
- [ ] 已有精确命令或截图且 2/2 时不得重复测试。
- [ ] 只有第三方无法从正文构造输入时，才追加 fixture/命令评论。
- [ ] 写入 `audit-peripheral.md`，分别给出四个 Issue 的最终状态。

## Task 4：最终汇总与 QA 关闭判定

**输入：** `audit-core.md`、`audit-cancellation.md`、`audit-peripheral.md`  
**输出：** `issue-repro-audit-report.md`

- [ ] 确认三份结果文件均存在，且总计恰好覆盖 10 个 Issue、没有重复或遗漏。
- [ ] 汇总每个 Issue 的最终状态、复现次数、证据链接和 #2678 关系。
- [ ] 检查所有 `needs-comment` 是否已追加评论并核对远端内容。
- [ ] 若存在 `needs-minimal-rerun` 或 `blocked-environment`，不得宣告整个审计完成；列出下一项最小任务。
- [ ] 若 10 个 Issue 均为 `ready-stable` 或 `ready-with-boundary`，向 #2678 追加一条最终 QA 关闭评论。
- [ ] 最终评论只引用三份分组结论、公开证据索引和云端遗留清单，不重复粘贴完整测试报告。
- [ ] 更新 `SHA256SUMS`，提交并推送 `objectstack-backup/main`。
- [ ] 验证公开文档 HTTP 200、PNG 为 `image/png`、评论链接可访问、备份仓库工作树干净。
- [ ] 最终确认 framework/objectui 无产品代码修改，3000/5180 无本任务监听。

## 建议的新 Chat 提示词

### Chat A

```text
读取 /Users/yinlianghui/Documents/GitHub/objectstack-backup/framework/issue-2678/2026-07-11/issue-repro-audit-plan.md，使用 superpowers:executing-plans，只执行 Task 0 和 Task 1。只审计 framework #2802/#2803/#2804/#2806，不修代码。把完整结果写入计划指定的 audit-core.md；过程极简输出。
```

### Chat B

```text
读取 /Users/yinlianghui/Documents/GitHub/objectstack-backup/framework/issue-2678/2026-07-11/issue-repro-audit-plan.md，使用 superpowers:executing-plans，只执行 Task 0 和 Task 2。只审计 framework #2824 与 objectui #2393，不修代码；现有 2/2 证据充分时不得重跑 50,000 行任务。把结果写入计划指定的 audit-cancellation.md。
```

### Chat C

```text
读取 /Users/yinlianghui/Documents/GitHub/objectstack-backup/framework/issue-2678/2026-07-11/issue-repro-audit-plan.md，使用 superpowers:executing-plans，只执行 Task 0 和 Task 3。只审计 framework #2801/#2805/#2807/#2823，不修代码。把结果写入计划指定的 audit-peripheral.md；已有 2/2 证据充分时不重复测试。
```

### 最终汇总 Chat

```text
读取 /Users/yinlianghui/Documents/GitHub/objectstack-backup/framework/issue-2678/2026-07-11/issue-repro-audit-plan.md 以及计划指定的三份分组结果，只执行 Task 4。不要修代码；只有 10 个 Issue 均达到 ready-stable 或 ready-with-boundary 时，才向 #2678 追加最终 QA 关闭评论。
```
