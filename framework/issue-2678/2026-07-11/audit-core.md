# 审计组 A 结果

## 环境与证据

- 文档审计时间：2026-07-11 15:02 CST（Asia/Shanghai）
- 独立重现审计时间：2026-07-11 16:38 CST（Asia/Shanghai）
- 固定 baseline：Framework `98874656ffc50ce1531af52346228ffcdda73fba`；归因 baseline `21420d9f82ebdcd53a6361ded3d829723bcab18e`；ObjectUI `80901aad44ff3beeaf7882ec3367da934325b2f2`（仅 #2806 UI 补证适用）
- 审计输入：`issue-repro-audit-plan.md`、完整 `qa-report.md`、`README.md` 截图索引、四个 Issue 的正文及全部评论、固定 baseline 下相关源码
- Issue 状态：framework #2802/#2803/#2804/#2806 均为 `open`
- 是否启动服务：否；未占用或停止 3000/5180 端口上的任何进程。#2804 seed 与 #2806 分别使用 harness 自建并在退出前删除的全新临时 SQLite 文件
- 云端边界：`cloud-not-tested`；未验证真实 Turso/libSQL 错误对象、远程提交后响应丢失、连接池、冷启动、HotCRM 事故环境或远程绝对延迟

| Issue | Identity | Baseline | Preconditions | Fixture | Steps | Expected | Actual | Stability | Evidence | Boundary | 最终状态 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| [#2802](https://github.com/objectstack-ai/framework/issues/2802) | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | `ready-with-boundary` |
| [#2803](https://github.com/objectstack-ai/framework/issues/2803) | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | `ready-stable` |
| [#2804](https://github.com/objectstack-ai/framework/issues/2804) | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | `ready-with-boundary` |
| [#2806](https://github.com/objectstack-ai/framework/issues/2806) | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | `ready-stable` |

### 历史证据 — #2802 瞬时错误 classifier

- Identity/Baseline：标题、仓库、编号和 Framework SHA 均明确；ObjectUI 为 `not-applicable`。源码边界是 #2680 新增的 `packages/core/src/utils/bulk-write.ts`，到固定 baseline 未再变化。
- Preconditions/Fixture/Steps：这是无数据库状态的纯函数边界。正文给出可直接调用的 `defaultIsTransientError(new Error('service unavailable'))`，并把已通过的 `503`、`fetch failed`、connection reset、timeout 与不应重试的 validation/constraint 错误排除在本 finding 外。
- Expected/Actual：标准 availability 错误应进入配置的 transient retry；实际 `/server.*unavailable/i` 不匹配 `service unavailable`，batch 立即降级，逐行同类错误也不重试。
- Stability：同一确定性纯函数样本 2/2；独立数据策略为 `not-applicable`，无可变数据库状态。
- Evidence/Boundary：Issue 中的源码位置和 QA 报告 CORE-03/F-CORE-001 一致。本地 classifier 缺口独立成立；真实 Turso/libSQL 错误对象仍为 `cloud-not-tested`，因此状态为 `ready-with-boundary`。

### 历史证据 — #2803 batch 响应契约

- Identity/Baseline：标题、仓库、编号和 Framework SHA 均明确；ObjectUI 为 `not-applicable`。边界是 #2680 新增 `bulkWrite` 后对 `records[i]` 的位置型信任。
- Preconditions/Fixture/Steps：对多行输入分别让 `writeBatch` 返回 short、long、reverse、non-array 四类响应；四种响应类型逐项列出，且 `undefined` 会抛错并安全降级，明确不属于本 Bug。
- Expected：在将 batch 结果标为成功前，必须证明数组类型、与输入完全相同的 cardinality，以及可接受的顺序/相关性；不能证明时应拒绝或安全降级。
- Actual：short 生成 `ok:true/record:undefined`，long 静默忽略多余记录，reverse 把 ID 关联到错误输入，non-array 未被类型守卫安全拒绝；真实 import 还确认缺失 ID、错配 ID 及 undo 漏记。
- Stability/Evidence：四类响应均 2/2；测试为确定性函数输入，独立数据库数据为 `not-applicable`。Issue 源码边界、CORE-06、IMP-05/08 与报告一致。
- Boundary：普通顺序响应通过；问题由 #2680 引入，不依赖云环境，状态为 `ready-stable`。

### 历史证据 — #2804 两条顺序兼容路径绕过 retry

- Identity/Baseline：标题、仓库、编号和 Framework SHA 均明确；ObjectUI 为 `not-applicable`。正文明确这是 #2678 验收覆盖缺口，而不是相对 #2680 前顺序语义的回归。
- Preconditions/Fixture/Steps：Issue 正文与现有评论已完整覆盖两条路径：
  1. 自引用 `employee.manager_id -> employee.name` seed，Alice/Bob 及 update 三个首次写入点分别注入一次 `fetch failed`；
  2. 无 `createManyData` 的 protocol，以单行 `{ name: 'R1' }` 让 `createData` 第一次抛出 `fetch failed`、第二次可成功。
- Expected/Actual：两条路径都应在不改变顺序或兼容语义的前提下尝试 2 次；实际均仅尝试 1 次并报错。自引用 Alice/Bob/update 和 no-bulk import 各场景均为 2/2 fresh/独立状态。
- Evidence/Boundary：源码确认 `SeedLoaderService.writeRecord` 与 import 的 inline `createData` 直接调用未经过 `withTransientRetry`；正常 bulk seed/import 和 import update 的 retry 已通过，因此两个症状共享“顺序兼容写入绕过统一 retry”的根因与修复边界。真实 Turso/libSQL 错误对象为 `cloud-not-tested`，状态为 `ready-with-boundary`。

### 历史证据 — #2806 同文件新父记录在 lookup 时不可见

- Identity/Baseline：Framework 与 ObjectUI 固定版本均明确。Issue 将回归边界定位为 #2680：先 resolve/cache lookup，后 flush `pendingCreates`；普通 lookup 到既有记录不受影响。
- Preconditions/Fixture/Steps：核心 fixture 为 Alice、`Bob.manager=Alice`、`Carol.manager=Alice`，并对有/无 `createManyData` protocol 做对照；UI 评论进一步固定“既有父项成功 + 创建同文件新父项 + 后续引用新父项失败”的规则，并使用两轮不同唯一名称。
- Expected/Actual：bulk 与顺序兼容路径应同为 3/3；实际 integration bulk 为 1 created/2 reference errors、顺序兼容路径 3/3。真实 Showcase HTTP 再确认；UI 两轮均为已有父项可解析、新父项可创建、同文件新父项引用失败，结果 2 created/1 skipped，错误为 `no showcase_category matches`。
- Stability：integration harness 2/2；真实 HTTP 再确认；UI 使用 Engineering/Operations 两组独立唯一名称 2/2。
- Evidence：正文提供源码边界；公开 UI 截图链接已验证 HTTP 200 且 `content-type: image/png`；UI/API/SQLite 三层对照均记录在评论与 QA 报告中。
- Boundary：这是 #2680 buffering 引入的确定性本地回归，不要求 batching lookup reads，也不依赖云环境，状态为 `ready-stable`。

## 本轮 independent audit

以下结果仅根据四个 Issue 当前正文与评论构造，不读取旧数据库，不复用旧服务、旧 fixture 或隐藏 Chat 状态。命令均在固定 baseline `98874656ffc50ce1531af52346228ffcdda73fba` 的现有 linked worktree `/Users/yinlianghui/Documents/GitHub/framework-pr2680-qa-v2` 中运行。临时脚本位于 `/tmp/objectstack-issue-audit-A-20260711-1/`；命令的 exit 0 表示 harness 成功断言“实际行为与 Issue 所述一致”，不是产品行为通过。

### #2802 independent run

- 输入：`defaultIsTransientError(new Error('service unavailable'))`。
- 命令：`pnpm exec tsx /tmp/objectstack-issue-audit-A-20260711-1/repro-2802.ts`
- 预期：标准 availability 错误应被分类为 transient，即 `classifiedTransient=true`。
- 实际：`classifiedTransient=false`；与 Issue 一致。
- 退出码：`0`。
- 本轮独立复现次数：`1/1`；纯函数无数据库状态，独立数据为 `not-applicable`。

### #2803 independent run

- 输入：两行 `[{key:'a'},{key:'b'}]`；`writeBatch` 分别返回：
  - short：`[{id:'id_a'}]`；
  - long：`[{id:'id_a'},{id:'id_b'},{id:'id_extra'}]`；
  - reverse：`[{id:'id_b'},{id:'id_a'}]`；
  - non-array：`{records:[{id:'id_a'},{id:'id_b'}]}`。
- 命令：`pnpm exec tsx /tmp/objectstack-issue-audit-A-20260711-1/repro-2803.ts`
- 预期：无法证明 array 类型、精确 cardinality 和契约顺序的响应应被拒绝或安全降级。
- 实际：
  - short：两行均为 `ok:true`，第二行 `recordId=null`；
  - long：仅保留前两个结果，`id_extra` 被静默忽略；
  - reverse：输入 0/1 分别得到 `id_b/id_a`，发生位置错配；
  - non-array：两行均为 `ok:true/recordId=null`，未安全拒绝。
- 退出码：首次命令 `1`，原因是临时 harness 使用 CJS 不支持的 top-level await，尚未调用 `bulkWrite`；按规则只做一次诊断修正。诊断重复命令相同，退出码 `0`。
- 本轮独立复现次数：short `1/1`、long `1/1`、reverse `1/1`、non-array `1/1`；首次 harness transform 失败不计产品复现轮次。

### #2804 independent runs

#### 自引用 seed 顺序路径

- 输入：全新临时 SQLite `employee(id,name,manager_id)`；seed 为 `Alice`、`Bob.manager_id=Alice`，`name` 为 externalId，insert 模式；Bob 的第一次顺序 insert 抛出 `Error('fetch failed')`，若重试则第二次写入真实 SQLite。
- 命令：`pnpm exec tsx /tmp/objectstack-issue-audit-A-20260711-1/repro-2804-seed.ts`
- 预期：Alice 尝试 1 次、Bob 尝试 2 次；`totalInserted=2`、`totalErrored=0`，Bob 的 manager 指向 Alice ID。
- 实际：Alice/Bob 各尝试 1 次；`totalInserted=1`、`totalErrored=1`；SQLite 仅有 Alice，Bob 未写入。与 Issue 所述顺序路径绕过 retry 一致。
- 退出码：`0`。
- 本轮独立复现次数：`1/1`；数据库由 harness 新建并在退出前删除。

#### 无 `createManyData` import 路径

- 输入：仅实现 `findData/createData/updateData` 的 protocol；单行 `{name:'R1'}`；第一次 `createData` 抛出 `Error('fetch failed')`，若重试则第二次返回 `{id:'id_R1'}`。
- 命令：`pnpm exec tsx /tmp/objectstack-issue-audit-A-20260711-1/repro-2804-import.ts`
- 预期：`createAttempts=2`、`created=1`、`errors=0`。
- 实际：`createAttempts=1`、`created=0`、`errors=1`；行结果为 `IMPORT_ROW_FAILED/fetch failed`。与 Issue 一致。
- 退出码：`0`。
- 本轮独立复现次数：`1/1`；protocol 与计数器均为本进程新建状态。

### #2806 independent run

- 输入：全新临时 SQLite `category(id,name,parent_id)`，预置唯一父项 `ExistingParent(id=cat_existing)`；同一 import 的三行依次为：
  1. `ChildExisting.parent_id=ExistingParent`（已有父记录成功对照）；
  2. `NewParent`；
  3. `ChildNew.parent_id=NewParent`（同文件新父记录）。
  protocol 同时实现 `createManyData`，`progressEvery=200`，确保三行 lookup/coercion 完成后才 flush pending creates。
- 命令：`pnpm exec tsx /tmp/objectstack-issue-audit-A-20260711-1/repro-2806.ts`
- 预期：两种 lookup 均成功，`created=3/errors=0`。
- 实际：`created=2/errors=1`；`ChildExisting.parent_id=cat_existing`，证明已有父项 lookup 正常；`NewParent` 已创建；`ChildNew` 未创建，第三行返回 `reference_not_found` 与 `parent_id: no category matches "NewParent"`。与 Issue 一致。
- 退出码：`0`。
- 本轮独立复现次数：`1/1`；数据库由 harness 新建并在退出前删除。

### 本轮与历史证据对照

- #2802、#2803、#2804 两条路径、#2806 均与 Issue 和历史 QA 证据一致，没有触发第二次产品复现或扩大测试范围。
- #2803 仅因临时 harness 的模块格式错误做了一次诊断重复；错误发生在 transform 阶段，修正后四类产品输入各执行一次。
- 本轮没有发现 Issue 缺少必要复现信息，亦没有发现与 Issue 不同的结果，因此未修改或追加 GitHub 评论。

## 补充动作

- 追加评论：本轮无。历史上已存在 [#2804 可复现性补充](https://github.com/objectstack-ai/framework/issues/2804#issuecomment-4943319816)；本轮结果与 Issue 一致且信息充分，未修改或追加任何评论。
- 独立重现：#2802 运行 1 次；#2803 四种响应各运行 1 次（另有一次未进入产品逻辑的 harness transform 失败及一次诊断重复）；#2804 两条路径各运行 1 次；#2806 使用全新 SQLite 状态运行 1 次。详细命令、输入、预期、实际与退出码见上节。
- 产品代码/测试代码：未修改；仅更新本审计文档。临时 harness 和临时数据库在完成前删除。

## 未解决缺口

- 云端共同边界：真实 Turso/libSQL 错误对象及远程运行条件未测；不得从本地证据推断云端通过。
