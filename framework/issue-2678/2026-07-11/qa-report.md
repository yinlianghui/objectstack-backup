# PR #2680 批量写入 QA 执行报告

## 固定基线

- Worktree：`/Users/yinlianghui/Documents/GitHub/framework-pr2680-qa-v2`
- Branch：`codex/pr2680-qa-v2`
- Main baseline：`98874656ffc50ce1531af52346228ffcdda73fba`
- Attribution baseline：`21420d9f82ebdcd53a6361ded3d829723bcab18e`
- Plan：`docs/superpowers/plans/2026-07-10-pr-2680-bulk-write-qa.md`

## 当前检查点

- 状态：`completed`
- 当前任务：`任务 7 UI follow-up 已完成`
- 下一动作：无；按计划停止
- 活跃 PID：无
- 最近更新时间：2026-07-11 11:17 CST

归档说明：`commands/*`、`summary/*` 与 `/tmp/objectstack-*` 是执行期间的临时工作产物，已按清理要求删除且未收入公开存证仓库；相关命令结果、计数、Finding 和判定已汇总在本报告。公开耐久截图位于同目录的 `screenshots/`。

## #2678 验收矩阵

| 验收条件 | 测试 ID | 状态 | 证据/结论 |
|---|---|---|---|
| Seed/import 使用共享 bulk helper | CORE-01、SEED-01、IMP-01 | passed | helper、真实 SQL seed、真实 REST import 三层均通过 |
| 写入次数约为 `ceil(N/batch)` | CORE-01、SEED-01、IMP-01、PERF-01 | passed | 1000/200：5 次 engine batch、5 次 driver bulk、0 次 single；IMP 5000=25、job 50000=250 |
| 瞬时错误得到重试 | CORE-03/04、SEED-06/08、IMP-10/11 | partial-fail | IMP-10 全部支持路径通过；CORE-03、SEED-08 失败；IMP-11 为显式兼容风险 |
| 逻辑错误按行隔离 | CORE-05、SEED-05、IMP-09 | passed | 三层均通过；真实 Import 199/200，错误保持 row 89 |
| 汇总重算受唯一父记录数约束 | SEED-10、PERF-02 | passed | 单父每 batch 1 次，共 5；十父每 batch 10 次，共 50；不宣称整次 load 仅一次 |
| 结果顺序无回归 | CORE-06、IMP-05 | failed | 正常响应顺序通过；short/reverse 响应在 helper 与真实 Import 均确认 F-CORE-002 |

## 顶层任务状态

| 任务 | 状态 | 关键计数/证据 | Finding |
|---|---|---|---|
| 任务 0：计划审查与固定基线 | passed | HEAD/分支/linked worktree/merge-base 均通过；验收追踪完整；`commands/task0-*.log`、`summary/acceptance-trace.md` | 无 |
| 任务 1：环境预检 | completed-with-blockers | Node 22.14.0；pnpm 10.31.0；install 22.7s；强制 build 70/70、0 cached、4m13.97s；真实后端 health/login/import route 通过；objectui 与浏览器 UI 条件阻塞 | F-ENV-001 |
| 任务 2：现有自动化基线 | passed | 专项 5/5、245 tests；全套 7/7、2332 passed/2 skipped；full-dogfood 读取既有完整 exit 0，未重跑；`summary/task2-baseline.md` | 无 |
| 任务 3：`bulkWrite` 契约与故障模型 | completed-with-findings | 两次真实执行一致：11 场景组，5 pass/6 fail；CORE-01/02/04/05 pass；CORE-03/06 fail；CORE-07 风险确认；`summary/task3-core.md` | F-CORE-001、F-CORE-002、F-RISK-001 |
| 任务 4：真实 SQL 与 Seed Loader | completed-with-findings | 两次 fresh SQLite 执行一致：20 场景组，16 pass/4 fail；SEED-01–07、10–12 通过；SEED-08/09 发现问题；`summary/task4-seed.md` | F-SEED-001、F-SEED-002 |
| 任务 5：Import Runner 与 REST 集成 | completed-with-findings | 两次稳定执行一致：28 场景组，22 pass/6 fail；含 50k/50,001、progress/cancel/undo、重试、context、CSV；`summary/task5-import.md` | F-CORE-002（下游确认）、F-IMP-001、F-RISK-002、F-RISK-003 |
| 任务 6：真实 Showcase API | completed-with-findings | 20 个真实对象；HTTP 场景 10 组，9 pass/1 fail；5/201/1000 同步、1001 async、createMany、lookup、invalid、upsert、重启均完成；`summary/task6-showcase.json` | F-IMP-001（真实 HTTP 下游确认） |
| 任务 7：UI CSV Dogfood follow-up | completed-with-findings | 用户授权浏览器隔离例外后，固定 ObjectUI `80901aad`，在全新 `--fresh` 后端完成 UI-01–06；UI/API/SQLite 三方对账；关键截图已展示 | F-IMP-001（UI 下游确认）、F-UI-001、F-UI-002 |
| 任务 8：性能、可靠性与范围边界 | completed | PERF-01/02 passed；PERF-03/04 observed；5 轮中位数及 RSS/CPU/参数/日志/50k 边界已记录；`summary/performance.md` | 无新增 finding |
| 任务 9：发现分诊与 GitHub Issue | completed | 初始 9 findings 完成查重/只读归因并创建 7 个 issue（#2801–#2807）；UI follow-up 再确认 2 个端到端 finding，按仓库/修复边界创建 framework #2823/#2824 与 objectui #2393；#2678 保持统一 QA 汇总入口；`summary/task9-triage.md` | 见 Findings 与 GitHub Issues |
| 任务 10：清理与完成前验证 | completed | 原 QA 临时目录已删除；干净源码专项验证 5/5 命令、6 files、245/245 tests；产品代码无 diff；仅保留计划与本报告 | 无 |

## Findings

| ID | 分类 | 状态 | 最小复现 | 根因范围 | Issue |
|---|---|---|---|---|---|
| F-ENV-001 | dev-script/CLI 文档命令 | confirmed-preexisting-bug | `pnpm dev -- --fresh -p 38421`，2/2 exit 2 | #2680 前既存的文档/脚本组合 | [#2801](https://github.com/objectstack-ai/framework/issues/2801) |
| F-CORE-001 | 瞬时错误分类 | confirmed-acceptance-bug | `service unavailable` 2/2 被判为非瞬时 | #2680 引入 classifier pattern | [#2802](https://github.com/objectstack-ai/framework/issues/2802) |
| F-CORE-002 | batch 返回契约 | confirmed-regression | 短/长/逆序/非数组响应 2/2 未被安全拒绝 | #2680 的 `records[i]` 信任边界 | [#2803](https://github.com/objectstack-ai/framework/issues/2803) |
| F-RISK-001 | exactly-once 可靠性风险 | risk-not-bug | 首次已提交后 `fetch failed`，自动 ID 重试产生 4/2 记录 | 无幂等键/commit-ack 契约；云端未验证 | 不创建 issue |
| F-SEED-001 | 自引用 seed 重试 | confirmed-acceptance-gap | Alice/Bob/update 各 2/2 仅尝试一次 | #2680 保留顺序路径但遗漏 retry | [#2804](https://github.com/objectstack-ai/framework/issues/2804) |
| F-SEED-002 | deferred update 错误传播 | confirmed-preexisting-bug | 2/2 返回 success 且不报告失败 | `11f9767336` 既存 pass-2 catch 仅 warn | [#2805](https://github.com/objectstack-ai/framework/issues/2805) |
| F-IMP-001 | 同文件 lookup 引用 | confirmed-regression | bulk 1/3，顺序兼容路径 3/3，2/2；HTTP 再确认 | #2680 pending create 在 resolve 后才 flush | [#2806](https://github.com/objectstack-ai/framework/issues/2806) |
| F-RISK-002 | 无 bulk protocol 重试边界 | confirmed-acceptance-gap-non-regression | createData 瞬时失败仅尝试一次，2/2 | 旧 inline 兼容路径未包 retry | [#2804](https://github.com/objectstack-ai/framework/issues/2804) |
| F-RISK-003 | 重复 CSV 列 | confirmed-design-gap | 同名/同目标列静默 last-wins，2/2 | #2771 parser 未校验 effective header | [#2807](https://github.com/objectstack-ai/framework/issues/2807) |
| F-UI-001 | 后台导入取消 | confirmed-bug | 两次 50,000 行任务均在取消控件可见时点击；前端立即显示已取消，但最终作业表/业务表仍为 succeeded + 50,000/50,000 | 后端实际未停止与前端静默吞错后无条件构造 cancelled 结果属于两个仓库、两个修复边界；精确后端事件循环时序仍需 instrumentation | [framework #2824](https://github.com/objectstack-ai/framework/issues/2824)、[objectui #2393](https://github.com/objectstack-ai/objectui/issues/2393) |
| F-UI-002 | Showcase Capability Map 导航 | confirmed-incidental-bug | `Projects (backbone)` 连续 2/2 导航到嵌套错误 URL并显示 Page not found | `capability-map.page.ts:59` 使用无前导 `/` 的相对 href；与 #2678 导入功能独立 | [#2823](https://github.com/objectstack-ai/framework/issues/2823) |

## 执行约束记录

- 仓库内未找到可读的 `dogfood-verification/SKILL.md`；按计划回退到 `AGENTS.md` 和内置浏览器规则。
- 用户明确禁止创建新 worktree。若任务 9 需要历史归因，不执行计划中的 detached worktree 命令，改用当前 worktree 内的只读历史检查，并在结论中标注限制。
- 启动状态允许的未跟踪产物为计划与本报告，服从本轮用户明确前置条件。
- 前一轮在任务 3 后停止；本轮获授权继续任务 4–5，临时证据持续保留。
- 任务 9 复用既有两次复现证据完成查重、只读历史归因、分类与 Issue 创建；#2678 作为唯一 QA 汇总入口，误发到 #2504 的评论已删除。该轮曾按检查点停止；本轮获授权继续任务 10。
- 归因受“不创建 worktree”约束：未运行 detached attribution worktree；使用当前 linked worktree 内的 `git show/diff/blame/log`。#2680 后 `bulk-write.ts`、`seed-loader.ts`、`import-runner.ts` 均未变化。
- 任务 10 已按授权执行：未触碰 GitHub Issue；删除全部 `/tmp/objectstack-pr2680-qa-98874656` 临时证据后，在干净源码上重跑专项基线并完成最终报告。
- UI follow-up 获得两项后续授权：允许使用 Codex 内置浏览器新 tab + 全新本地后端作为隔离例外；随后允许完整执行 UI-01–06。全程只测试与记录，不修改 framework/objectui 产品代码，不提交，不触碰 GitHub。
- systematic debugging 对 UI-04、UI-05 取消与 Capability Map 导航均至少执行两次；后续统一分诊完成查重和源码边界检查，将 UI-05 拆为 framework #2824 与 objectui #2393，将附带导航问题记录为 framework #2823。

## GitHub Issues

| Issue | Finding | 动作 | 状态 |
|---|---|---|---|
| [#2801](https://github.com/objectstack-ai/framework/issues/2801) | F-ENV-001 | 新建 | open |
| [#2802](https://github.com/objectstack-ai/framework/issues/2802) | F-CORE-001 | 新建 | open |
| [#2803](https://github.com/objectstack-ai/framework/issues/2803) | F-CORE-002 | 新建 | open |
| [#2804](https://github.com/objectstack-ai/framework/issues/2804) | F-SEED-001、F-RISK-002 | 合并同一 retry 根因后新建 | open |
| [#2805](https://github.com/objectstack-ai/framework/issues/2805) | F-SEED-002 | 新建 | open |
| [#2806](https://github.com/objectstack-ai/framework/issues/2806) | F-IMP-001 | 新建 | open |
| [#2807](https://github.com/objectstack-ai/framework/issues/2807) | F-RISK-003 | design/validation issue | open |
| [#2824](https://github.com/objectstack-ai/framework/issues/2824) | F-UI-001 后端取消未生效 | UI follow-up 后新建 | open |
| [objectui #2393](https://github.com/objectstack-ai/objectui/issues/2393) | F-UI-001 前端误报取消 | 按不同仓库/修复边界单独新建 | open |
| [#2823](https://github.com/objectstack-ai/framework/issues/2823) | F-UI-002 | 与 #2678 独立的附带发现 | open |
| [#2678 初始 QA summary](https://github.com/objectstack-ai/framework/issues/2678#issuecomment-4940470485) | 初始 7 个 Issue、exactly-once 风险、UI/云未测 | 历史汇总，未改写 | posted |
| [#2678 UI follow-up](https://github.com/objectstack-ai/framework/issues/2678#issuecomment-4942013799) | UI-01～06、3 个 UI follow-up issue、云端遗留边界 | 独立补充评论 | posted |

### #2678 统一 QA 汇总入口

#2678 初始汇总评论按以下分类列出首轮 7 个 Issue：

- 直接相关：#2802、#2803、#2804、#2806。
- 原有但影响验收：#2805。
- 附带发现：#2801、#2807。

同一评论同时记录：未建 Issue 的 exactly-once/commit-ack 风险；当时 UI-01–06 阻塞未测；真实 Turso/libSQL 错误对象、远程提交后响应丢失、连接池、冷启动、HotCRM 事故环境和远程绝对延迟等云端遗留未测。#2504 评论已删除，#2806/#2807 正文不再关联 #2504。

上述初始评论保持为历史内容，未做大段改写。UI follow-up 已通过[独立评论](https://github.com/objectstack-ai/framework/issues/2678#issuecomment-4942013799)补充：UI-01～06 已全部执行；UI-04 再确认 #2806；UI-05 的端到端取消故障分别记录为 framework #2824 与 objectui #2393；独立的 Capability Map 导航问题记录为 framework #2823。#2678 仍是本轮 QA 的统一总结入口，未向 #2504 或其他总任务追加关联评论。

## UI 关键证据

用户明确授权浏览器隔离例外后，任务 7 使用 Codex 内置浏览器新 tab、ObjectUI 固定版本和本任务全新 `--fresh` 后端执行。未使用 HotCRM、日常浏览器或既有后端登录态。关键界面截图已在聊天中展示；原始截图在执行期间位于 `/tmp/objectstack-pr2680-qa-98874656/screenshots/`，报告完成后按仓库规则清理。

### UI follow-up 耐久截图补证

2026-07-11 按维护者要求补做耐久截图。先尝试从本 Chat、`/tmp` 与 Codex 本地缓存恢复先前已展示截图；当前工具无法反向导出聊天图像，且原 `/tmp` 证据已按前轮收尾删除，因此只在同一 framework 基线、固定 ObjectUI commit 和全新 `--fresh` 后端上最小重现下列代表性状态。此轮是**截图补证**，不重新执行整套 UI-01～06，也不改变原测试结论、Finding 分类或 2/2 复现计数。

| 截图 | 测试 ID | 证明内容 |
|---|---|---|
| [`screenshots/ui-01-field-mapping.png`](screenshots/ui-01-field-mapping.png) | UI-01 | CSV 的 `name/status/industry/annual_revenue` 四列被自动映射到客户名称、生命周期、行业、年收入。 |
| [`screenshots/ui-01-success-result.png`](screenshots/ui-01-success-result.png) | UI-01 | 最小补证数据 5/5 成功，结果页显示“新建 5 条”。 |
| [`screenshots/ui-03-upsert-invalid-result.png`](screenshots/ui-03-upsert-invalid-result.png) | UI-03 | Upsert 结果为新建 1、更新 1、跳过 2，并保留原 CSV 第 3 行非法 status 错误。 |
| [`screenshots/ui-04-same-file-lookup-reference-not-found.png`](screenshots/ui-04-same-file-lookup-reference-not-found.png) | UI-04 / F-IMP-001 | 已有父项可解析、新父项可创建，但同文件后续子项引用新父项时报 `no showcase_category matches`，结果为新建 2、跳过 1。 |
| [`screenshots/ui-05-cancel-button-visible.png`](screenshots/ui-05-cancel-button-visible.png) | UI-05 / F-UI-001 | 50,000 行后台任务运行期间，`导入中…` 左侧取消控件可见；截图后由本 Chat 自动化立即点击。 |
| [`screenshots/ui-05-cancel-confirmed.png`](screenshots/ui-05-cancel-confirmed.png) | UI-05 / F-UI-001 | 点击后 UI 显示“导入已取消 / 已导入 0 条”，证明取消动作由本 Chat 完成。产品未弹出额外原生 confirm 对话框（`getJsDialog()` 返回空），因此不存在需要用户代点的确认框。 |
| [`screenshots/ui-05-cancelled-job-history-succeeded.png`](screenshots/ui-05-cancelled-job-history-succeeded.png) | UI-05 / F-UI-001 | 同一补证栈的历史页仍显示 50,000/50,000、成功、新建 50,000 条；SQLite 对应最新作业 `imp_mrfrz30oyug0wjrv` 为 `succeeded`，业务表 `QA-EVID-UI05B-*` 为 50,000 条。 |
| [`screenshots/ui-06-automation-off.png`](screenshots/ui-06-automation-off.png) | UI-06 | “运行自动化与触发器”处于关闭状态。 |
| [`screenshots/ui-06-automation-on.png`](screenshots/ui-06-automation-on.png) | UI-06 | 同一预览数据下“运行自动化与触发器”处于开启状态。 |
| [`screenshots/f-ui-002-capability-projects-page-not-found.png`](screenshots/f-ui-002-capability-projects-page-not-found.png) | F-UI-002 | 从 Capability Map 点击 `Projects (backbone)` 后进入嵌套错误 URL并显示 `Page not found`。 |

以上 10 张 PNG 永久保留在本公开存证目录的 `screenshots/`，已逐张在本 Chat 展示；后续清理不得删除。

| 测试 | UI 结果 | API/数据库对账 | 状态 |
|---|---|---|---|
| UI-01 基础 CSV | 4 列自动映射；5/5 校验有效；新建 5 条；列表总数 13→18 | API 搜索返回 5；SQLite 精确 5 条且字段值一致 | passed |
| UI-02 201 行 | 预览前 10/201；同步导入新建 201 | API/SQLite 均为 201 条、名称 distinct 201、收入范围 200001–200201 | passed |
| UI-03 upsert + invalid | 按客户名称匹配；2 新建、2 更新、2 跳过；row 4 非法 status 明确报错，空 match key 跳过 | API/SQLite 确认 2 新、2 更新，非法/空名称均未落库 | passed |
| UI-04 lookup | 两轮均为 2 valid + 1 error；已有父项可解析，新父项可创建，同文件后续子项无法引用新父项 | API/SQLite 两轮均仅父项与引用既有父项的子项落库；同文件子项缺失 | failed-confirmed-bug（F-IMP-001 UI 下游确认） |
| UI-05 async/history/undo/cancel | 3 行后台任务可见进度，刷新后历史保留，Undo 成功且标记“已撤销”；50,001 行明确 `PAYLOAD_TOO_LARGE`；两次 50,000 行均在取消控件可见时点击但完整成功 | 3 行作业 `reverted=1` 且业务记录归零；两次取消作业均 `succeeded/50000/50000`，对应业务记录各 50,000 | partial-fail（F-UI-001；framework #2824、objectui #2393） |
| UI-06 automation context | 两个 1 行后台任务分别显示 automation 未选/已选，均新建成功 | API 返回两条记录；`sys_import_job.run_automations=0/1`；服务端映射为 `skipAutomations=true/false` | passed |

UI-06 请求证据链：内置浏览器控制接口没有 HAR/Network body 导出能力，未伪称抓到原始网络包。ObjectUI `assembleImportRequest` 明确把 checkbox 状态写入 `runAutomations`；后端 `prepareImportRequest` 从请求 body 解析该字段，async route 原样持久化到 `sys_import_job.run_automations`。两次真实 UI 提交的持久化值为 0/1，因而同时证明浏览器请求选项和后端观测 context 的差异；`import-runner.ts` 再将其映射为 `skipAutomations: !runAutomations`。

UI-04 systematic debugging：R1 使用 Engineering + 同文件新父项，R2 使用 Operations + 另一同文件新父项，现象 2/2 一致。ObjectUI 按行构造原始 rows；framework `import-runner.ts` 在 `coerceRow/resolveRef` 后才把 create 放入 `pendingCreates`，到 progress checkpoint 才 flush，因此后续行查询不到仍在内存中的父记录。与既有 F-IMP-001/#2806 根因一致，无需重复建单。

UI-05 systematic debugging：有效复现 R1/R2 均在 0/50,000 期间确认 `data-testid=import-cancel-async` 唯一存在并点击；约 8–10 秒后 UI、`sys_import_job`、`showcase_account` 三方均确认完整成功。前端 `handleCancelImport` 等待 `cancelImportJob` 且静默吞错；后端使用同进程 `cancelledImportJobs` Set，worker 每 200 行 flush 后检查。候选根因是同进程批量 worker 在任务结束前未让取消 HTTP 请求及时进入 handler；现有证据足以确认用户可见故障，精确事件循环归因仍需专门 instrumentation。

附带 finding F-UI-002：Capability Map 的 `Projects (backbone)` 2/2 从 `/apps/com.example.showcase/page/showcase_capability_map` 导航到 `/apps/com.example.showcase/page/apps/com.example.showcase/showcase_project` 并显示 Page not found；元数据源 `examples/app-showcase/src/ui/pages/capability-map.page.ts:59` 为无前导斜杠的 `apps/com.example.showcase/showcase_project`。已记录为 framework #2823，明确标注与 #2678 导入功能独立。

### UI follow-up preflight

- 时间：2026-07-11 CST；先完成环境可行性与准备，随后经用户明确指令执行 UI-01–06；始终不修改 GitHub Issue/评论。
- Framework：`/Users/yinlianghui/Documents/GitHub/framework-pr2680-qa-v2`，branch `codex/pr2680-qa-v2`，HEAD/基线 `98874656ffc50ce1531af52346228ffcdda73fba`；未创建或切换 worktree。
- ObjectUI：基线 `.objectui-sha` 明确 pin 为 `80901aad44ff3beeaf7882ec3367da934325b2f2`（不是猜测最新 `main`）。已检出到 `/Users/yinlianghui/Documents/GitHub/objectui` 的 detached HEAD，读取 `AGENTS.md` 后执行 `pnpm install --frozen-lockfile`（pnpm 10.31.0，47 个 workspace，19.7s）成功；未修改其产品源码。
- 磁盘：首次预检可用 `24,462,368 KiB`；clone/install 前 `24,314,124 KiB`；本次 UI 执行末、清理前 `19,461,528 KiB`（约 18.6 GiB，使用率 90%）。未删除任何既有文件；变化主要来自 ObjectUI checkout/dependencies、临时 SQLite 中约 150k 条取消测试记录、fixture 与截图。最终清理后的数值见“最终清理”。
- 浏览器：公开 capability 不能证明 OS 级 headless 或临时空 profile，维护者明确授权例外。实际使用 Codex 内置浏览器新 tab；首次进入为未登录页，使用全新后端 seed admin 登录；任务结束关闭本任务 tab。
- 服务：UI 执行使用 `pnpm exec objectstack dev --seed-admin --fresh -p 3000`（PTY session `34040`，临时 OS_HOME `/var/folders/h7/hkxx21nd4wx85njz64cl0ht00000gn/T/objectstack-dev-c54nvS`）与 ObjectUI Vite `:5180`（PTY session `8170`，`DEV_PROXY_TARGET=http://localhost:3000`）。
- 连通性：`http://localhost:3000/api/v1/health` 与 `http://localhost:5180/api/v1/health` 均为 HTTP 200（118 bytes）；`/api/v1/auth/get-session` 直接访问和经 Vite 代理均为 HTTP 200（4 bytes，未登录会话）。Vite 输出 `react-map-gl` / `maplibre-gl` optimizeDeps 解析警告，但未阻碍首页和 API 代理验证。
- 收尾与剩余阻塞：授权例外下无环境阻塞；UI-01–06 已执行。产品层剩余为 F-IMP-001、F-UI-001、F-UI-002；UI 执行阶段只记录本地候选、不修复、不提交，后续统一分诊阶段已创建 framework #2823/#2824 与 objectui #2393，仍未修改产品代码。

## 最终状态审计

以下审计仅使用计划允许的最终状态：`passed`、`failed-confirmed-bug`、`failed-environment`、`blocked`、`not-applicable`；无空状态。

| 测试 ID | 最终状态 | 说明 |
|---|---|---|
| PRE-BACKEND | failed-confirmed-bug | 文档命令转发失败，F-ENV-001 / #2801；替代正确命令验证后端可用 |
| PRE-UI | passed | ObjectUI 固定 pin、3000/5180 连通；浏览器 OS-headless/profile 证明项按用户明确例外授权处理 |
| Task 2 targeted baseline | passed | 初始与最终均 5/5 commands、6 files、245 tests |
| CORE-01/02/04/05 | passed | batching、边界、重试/降级、逻辑错误隔离通过 |
| CORE-03/06 | failed-confirmed-bug | F-CORE-001/#2802；F-CORE-002/#2803 |
| CORE-07 | not-applicable | exactly-once 无契约；记录为风险，未建 Issue |
| SEED-01–07、SEED-10–12 | passed | 真实 SQL、模式、类型、顺序、summary、context 通过 |
| SEED-08/09 | failed-confirmed-bug | F-SEED-001/#2804；F-SEED-002/#2805 |
| IMP-01–04、IMP-06/07、IMP-09/10、IMP-13/14 | passed | 批次/job/createMany/mode/progress/cancel/隔离/retry/context 通过 |
| IMP-05/08/11/12 | failed-confirmed-bug | #2803 下游结果/undo；#2804 retry gap；#2806 same-file lookup |
| IMP-15 | not-applicable | 重复 effective header 为 design gap，#2807；不冒充 #2680 回归 |
| SHOW-INV/CREATEMANY/SYNC-5/201/1000/UPSERT/INVALID/LOOKUP/ASYNC/RESTART | passed | 真实 HTTP 与持久化行为通过 |
| SHOW-SELFREF | failed-confirmed-bug | 真实 HTTP 再确认 F-IMP-001/#2806 |
| UI-01/02/03/06 | passed | UI/API/SQLite 三方结果一致；automation off/on 后端上下文为预期值 |
| UI-04 | failed-confirmed-bug | 同文件 lookup 2/2 复现 F-IMP-001/#2806 |
| UI-05 | failed-confirmed-bug | job/refresh/history/undo/50,001 边界通过；取消 2/2 无效，F-UI-001 / framework #2824 / objectui #2393 |
| PERF-01–04 | passed | 调用次数/summary 上界通过；相对耗时和资源观测已完成 |

执行计数摘要：任务 2 专项 245/245；全套历史基线 2,332 passed/2 skipped；自定义 CORE/SEED/IMP/SHOW 共 69 个场景组（52 passed，17 个 finding/risk 场景）；UI-01/02/03/06 passed，UI-04 与 UI-05 各有确认问题；云环境项目未测。

## 最终专项验证

删除临时 harness、数据库、fixture、日志和观测产物后，于 `98874656ffc50ce1531af52346228ffcdda73fba` 干净源码重新执行：

| 命令 | 结果 |
|---|---|
| `pnpm --filter @objectstack/core exec vitest run src/utils/bulk-write.test.ts` | 1 file，11/11 tests passed |
| `pnpm --filter @objectstack/rest exec vitest run src/import-runner-bulk.test.ts` | 1 file，5/5 tests passed |
| `pnpm --filter @objectstack/rest exec vitest run src/import-integration.test.ts` | 1 file，18/18 tests passed |
| `pnpm --filter @objectstack/rest exec vitest run src/import-job-integration.test.ts` | 1 file，8/8 tests passed |
| `pnpm --filter @objectstack/runtime exec vitest run src/seed-loader.test.ts src/http-dispatcher.test.ts` | 2 files，203/203 tests passed |

合计：5/5 commands，6/6 files，245/245 tests，exit 0。

UI follow-up 收尾在停止 3000/5180 服务后再次执行同一组命令（2026-07-11 10:27 CST）：5/5 commands、6/6 files、245/245 tests、exit 0。

## 性能与调用次数

- 1000 行、batch size 200：batch 路径固定 5 次 engine insert + 5 次 driver bulkCreate，0 次单条写；1000 条均持久化。
- summary：单父 batch 路径 5 次 recompute；十父 Task 4 路径 50 次，符合每 batch 唯一 parent 上界。
- Apple M1 / Node 22.14.0 / local SQLite，100-row warm-up 后 5 轮 1000 行中位数：single/no-summary 334.97ms，batch/no-summary 11.98ms，single/summary 651.73ms，batch/summary 13.32ms。仅作本机相对证据。
- 观测峰值 RSS 277,397,504 bytes；最大 CPU 599.822ms；最大 batch 200 行/600 record-field 参数单元；50k import 250 batches，完整日志 385,146 bytes。

## 云环境遗留未测

- 真实 Turso/libSQL 错误对象。
- 远程已提交但响应丢失。
- 云连接池限制、冷启动。
- HotCRM 事故环境。
- 远程绝对延迟。

以上均未标记通过或失败。

## 最终清理

- 临时 harness、数据库、fixture、日志、trace、summary：已删除；`/tmp/objectstack-pr2680-qa-98874656` 不存在
- 最终专项测试临时日志：报告提取结果后删除
- 后端/Vite/watcher：仅向本任务 PTY session `34040` / `8170` 发送 SIGINT；均 exit 130；3000/5180 无监听
- `--fresh` 后端目录：`/var/folders/h7/hkxx21nd4wx85njz64cl0ht00000gn/T/objectstack-dev-c54nvS` 已自动删除
- Codex 内置浏览器：本任务 4 个 localhost tab 已由 session finalize 关闭；未保留 handoff/deliverable tab
- 临时浏览器 profile：未创建
- detached attribution worktree：因用户禁止从未创建
- 产品/测试代码 diff：无
- Git 状态：仅保留计划、本最终执行报告与后续耐久截图补证目录
- 最终磁盘：可用 `19,662,052 KiB`（约 18.8 GiB，使用率 90%）；相对 UI 执行末、清理前 `19,461,528 KiB` 回收约 196 MiB。本轮未删除任何既有文件，只删除本任务 `/tmp` 产物和 fresh 后端临时目录。

### 耐久截图补证收尾（2026-07-11 11:01 CST）

- 本轮只启动 PTY session `68683`（framework fresh backend）与 `20427`（ObjectUI Vite），只关闭这两个 session；3000/5180 最终均无监听。
- fresh OS_HOME `/var/folders/h7/hkxx21nd4wx85njz64cl0ht00000gn/T/objectstack-dev-hZ4BhE` 因进程 SIGINT 后 exit 1 未自动清理，确认端口已释放后手工删除本任务专属目录（126 MiB）。
- `/tmp/objectstack-pr2680-qa-screenshots` fixture/log 目录已删除；Codex 内置浏览器本轮唯一 localhost tab 已 finalize 关闭。
- 永久保留本公开存证目录 `screenshots/` 的 10 张 1280×720 PNG；没有其他截图、fixture、日志或数据库残留。
- Framework 只保留既有计划、本报告和上述截图；ObjectUI 保持 detached `80901aad44ff3beeaf7882ec3367da934325b2f2` 且源码工作树无修改。
- 截图补证未修改产品代码、测试代码、GitHub Issue/评论，也未创建提交。
