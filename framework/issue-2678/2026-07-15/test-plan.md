# Issue 2678 最小补充证据测试计划

> **执行要求：** 后续实施必须使用 `superpowers:executing-plans`，按照本计划逐项执行，并用复选框（`- [ ]`）记录进度。

**目标：** 只补建 issue #2678 原始 QA 材料中缺失的可持久核验证据，包括：准确的测试对象、输入列及其值、原始调用轨迹、SQLite 落库状态，以及支撑“1,000 行批量写入”和“汇总按唯一父节点去重”结论的机器可读核对结果。

**测试架构：** 先对比原始测试计划、完整 QA 报告和最终报告，再基于固定 QA 提交和真实本地 SQLite 运行一个聚焦的 Vitest 测试程序。测试调用真实的 Seed Loader、Import Runner 及其协议层，并通过 ObjectQL 执行汇总重算；同时记录引擎层和驱动层调用。准确输入、对象定义、实际执行源码、原始输出、调用轨迹、SQLite 数据库、结构化结果、哈希和面向评审的报告全部保留，不进行清理。

**技术栈：** Node.js 22.14.0、pnpm 10.31.0、Vitest、ObjectQL、`@objectstack/metadata-protocol`、`@objectstack/rest`、`@objectstack/driver-sql`、better-sqlite3。

## 全局约束

- 固定 Framework 基线：`98874656ffc50ce1531af52346228ffcdda73fba`。
- 不修改产品代码，也不对当前 `main` 分支作出结论。
- 不重跑 #2802–#2806、50,000 行取消、UI、Turso、HotCRM 或之前的完整回归测试。
- 只执行四个必要场景：Seed 1,000 行、Import 1,000 行、1 个父节点的汇总去重、10 个父节点的汇总去重。
- 批次大小固定为 200；每条 1,000 行写入路径预期准确产生 5 次数组插入和 5 次驱动 `bulkCreate` 调用。
- 明确区分用户输入列与落库字段，包括系统生成的 `id` 和计算得到的汇总字段。
- 不得删除、截断、移走或覆盖任何测试产物。只有用户后续明确提出清理要求时才能清理。
- 保留整个 worktree、依赖目录、包内测试程序、SQLite 数据库、准确输入、日志、轨迹、生成结果、计划和报告。
- 已确认的 #2804 和 #2805 直接使用现有 issue 证据，本次不重复证明。
- 持久证据统一存放在 `docs/superpowers/reports/issue-2678-minimal-evidence/`。

## 文件清单

- 新建：`packages/rest/src/issue-2678-minimal-evidence.test.ts`——Vitest 实际执行并保留的包内测试程序。
- 新建：`docs/superpowers/reports/issue-2678-minimal-evidence/evidence.test.ts`——实际执行源码的持久副本。
- 新建：`docs/superpowers/reports/issue-2678-minimal-evidence/environment.json`——准确的基线、运行时、操作系统、架构、依赖和磁盘元数据。
- 新建：`docs/superpowers/reports/issue-2678-minimal-evidence/objects.json`——各场景使用的准确对象定义。
- 新建：`docs/superpowers/reports/issue-2678-minimal-evidence/inputs/*.json`——各场景准确的 1,000 行输入。
- 新建：`docs/superpowers/reports/issue-2678-minimal-evidence/databases/*.sqlite`——执行后保留的 SQLite 数据库。
- 新建：`docs/superpowers/reports/issue-2678-minimal-evidence/traces/calls.json`——原始引擎、驱动和汇总调用轨迹。
- 新建：`docs/superpowers/reports/issue-2678-minimal-evidence/results.json`——断言、调用次数、落库数量、汇总值、环境和耗时。
- 新建：`docs/superpowers/reports/issue-2678-minimal-evidence/run.log`——聚焦测试的原始输出。
- 新建：`docs/superpowers/reports/issue-2678-minimal-evidence/SHA256SUMS`——证据完整性校验清单。
- 新建：`docs/superpowers/reports/issue-2678-minimal-evidence/README.md`——简明最终报告及领导回复所需信息。
- 原地保留：整个专用 worktree 以及以上所有路径，直到用户明确要求清理。

---

## 原始材料对比与证据缺口

已对比以下材料：

- 原始测试计划：[固定备份提交中的 test-plan.md](https://github.com/yinlianghui/objectstack-backup/blob/82dd18a60b6120644945c107acb9ef9a15b8b0bf/framework/issue-2678/2026-07-11/test-plan.md)。
- 完整 QA 报告：[固定备份提交中的 qa-report.md](https://github.com/yinlianghui/objectstack-backup/blob/82dd18a60b6120644945c107acb9ef9a15b8b0bf/framework/issue-2678/2026-07-11/qa-report.md)。
- 最终 QA 报告：[final-qa-report.md](https://github.com/yinlianghui/objectstack-backup/blob/main/framework/issue-2678/2026-07-11/final-qa-report.md)。
- 上述报告实际测试的 Framework 基线：`98874656ffc50ce1531af52346228ffcdda73fba`。

| 证据领域 | 原始计划 | 现有报告 | 持久证据缺口 | 本次补充内容 |
|---|---|---|---|---|
| 固定环境 | 计划并在固定 Framework 提交和本地 SQLite 上执行 | 已报告提交、Node、pnpm、Apple M1/arm64 和本地 SQLite | 未保留原始环境清单和命令输出 | 将准确环境及依赖元数据保存到 `environment.json` 和 `run.log` |
| Seed 批量写入 | 计划了 1、199、200、201、400、1,000 行的真实 SQLite 场景 | 报告记载：1,000 行产生 5 次引擎数组写入、5 次驱动批量写入、0 次单行写入，落库 1,000 行 | 准确对象定义、1,000 行输入、原始调用轨迹和数据库已被清理 | 执行一个明确的 1,000 行 × 4 列场景，并保留以上四类缺失产物 |
| Import 批量写入 | 计划了最多 5,000 行的真实 Import/REST 场景 | 1,000 行同样报告为 5/5/0，且全部落库 | 准确对象定义、输入值、原始轨迹和数据库已被清理 | 通过真实 Import Runner 和协议层执行一个明确的 1,000 行 × 4 列场景 |
| 汇总去重 | 计划了单父节点、多父节点和跨批次重复父节点场景 | 报告记载：单父节点重算 5 次，10 个父节点重算 50 次 | 准确父子对象定义、数据分布、逐父节点值、原始轨迹和数据库已被清理 | 保留单父节点和 10 个父节点的输入、调用、最终记录和准确汇总值 |
| 本地性能耗时 | 计划预热，并重复测量 1,000 行单写与批写 | 已报告中位数和测试方法 | 原始基准产物已被清理，但耗时不是领导当前追问的重点 | 不重复性能基准；本次耗时仅作参考，不作为验收结论 |
| 暂时性错误重试缺陷 | 计划了重试、重试耗尽和逻辑错误测试 | #2804、#2805 已有直接失败证据；#2802 记录生产驱动覆盖边界 | 已约定回复所需的本地证据并不缺失 | 复用已有 issue 证据，不重跑已确认 bug |
| UI、50,000 行取消、Turso/libSQL | 围绕其他验收边界计划或执行 | 现有报告已经说明用途和限制 | 不属于本次缺失的本地批量数据定义证据 | 从本次补充测试中排除 |
| 证据留存 | 原测试完成后清理了测试程序、数据库、输入、日志和轨迹 | 目前只剩文字报告和部分截图 | 已无法独立复核原始结果 | 保留本次产生的全部产物，直到用户后续明确要求清理 |

**结论：** 四场景聚焦测试的范围是合适的，但必须定义为“补建缺失证据”，而不是重新进行完整验收。它准确补齐测试数据、列、对象、原始调用和落库值等缺失回答，同时避免重复已有的性能、UI、50,000 行、云端驱动和已确认 bug 测试。

---

### 任务一：锁定测试环境和证据约定

**文件：**

- 修改：`docs/superpowers/plans/2026-07-15-issue-2678-minimal-evidence.md`
- 新建：`docs/superpowers/reports/issue-2678-minimal-evidence/environment.json`
- 新建：`docs/superpowers/reports/issue-2678-minimal-evidence/results.json`

**输入与输出：**

- 输入：固定 worktree 提交和已安装的工作区依赖。
- 输出：后续所有结果引用的环境元数据。

- [x] **步骤 1：记录基线**

执行：

```bash
git rev-parse HEAD
git branch --show-current
node --version
pnpm --version
uname -m
sw_vers -productVersion
```

预期：提交为 `98874656...`，分支为 `codex/issue-2678-minimal-evidence`，Node 为 `v22.14.0`，pnpm 为 `10.31.0`，架构为 `arm64`。

- [x] **步骤 2：记录存储边界**

在 `environment.json` 中记录 worktree 大小、可用磁盘空间和证据留存规则。当前预计输入、4 个 SQLite 数据库、轨迹、日志和报告合计约 5–20 MB；保留依赖后的完整 worktree 约 1.2–1.3 GB。不得复制密钥、环境令牌或用户浏览器状态。将此前已经观察到的 `bulk-write.test.ts` 11/11 结果仅作为背景记录，本次补充测试不再重跑。

### 任务二：编写最小可执行证据程序

**文件：**

- 新建：`packages/rest/src/issue-2678-minimal-evidence.test.ts`
- 新建：`docs/superpowers/reports/issue-2678-minimal-evidence/evidence.test.ts`

**输入与输出：**

- 输入：`ObjectQL`、`SqlDriver`、`SeedLoaderService`、`ObjectStackProtocolImplementation` 和 `runImport`。
- 输出：写入证据目录的确定性输入和结构化结果。

- [x] **步骤 1：定义普通写入对象**

定义 `qa_seed_item` 和 `qa_import_item`，每个对象包含 5 个落库字段：系统生成的 `id`，以及 4 个用户输入字段 `external_key`、`name`、`amount`、`active`。每份输入准确包含 1,000 行 × 4 列：

```ts
{
  external_key: `item_${String(i).padStart(4, '0')}`,
  name: `Evidence Item ${String(i).padStart(4, '0')}`,
  amount: i + 1,
  active: i % 2 === 0,
}
```

Seed 和 Import 均按照 `external_key` 对落库记录排序，将全部 1,000 行的 4 个用户输入字段逐行与输入数据比较。同时核对唯一键范围 `item_0000`–`item_0999`、`amount` 总和 `500500`、准确的 `500` 个 true 和 `500` 个 false，以及明确的首行、中间行和末行样本。

- [x] **步骤 2：定义汇总对象**

定义 `qa_summary_parent`，包含系统生成的 `id`、用户输入字段 `name` 和计算汇总字段 `total_amount`。定义 `qa_summary_child`，包含系统生成的 `id` 和 4 个用户输入字段：`external_key`、`name`、`parent_id`、`amount`。

单父节点场景使用 1,000 行 × 4 列，`amount` 为 `1`–`1000`，预期 `total_amount: 500500`。10 个父节点场景将第 `i` 行分配给 `i % 10` 对应的父节点，并保持 `amount = i + 1`。因此，每个 200 行批次都包含全部 10 个父节点；每个父节点有 100 条子记录，预期汇总依次为 `49600`、`49700`、……、`50500`，合计 `500500`。两个场景均逐字段比较全部落库子记录与输入投影。

- [x] **步骤 3：只记录与验收有关的调用**

按对象记录：

```ts
type CallCounts = {
  engineArrayInsert: number;
  engineSingleInsert: number;
  driverBulkCreate: number;
  driverCreate: number;
  parentSummaryUpdate: number;
};
```

同时记录有序调用轨迹，包括对象名、操作、批次行数、唯一父节点数量和执行结果。监测代码必须继续调用真实写入逻辑，不能用桩替代成功写入。执行耗时不得表述为云端性能结果。

### 任务三：执行四个必要场景

**文件：**

- 测试：`packages/rest/src/issue-2678-minimal-evidence.test.ts`
- 新建：`docs/superpowers/reports/issue-2678-minimal-evidence/databases/*.sqlite`

**输入与输出：**

- 输入：任务二中定义的确定性对象、数据行和调用监测。
- 输出：用于生成报告的 SQLite 状态和结构化结果。

- [x] **步骤 1：验证 Seed 批量写入**

通过 `SeedLoaderService` 的 insert 模式，将准确的 1,000 行 × 4 列 Seed 输入加载到 `qa_seed_item`。断言：

```ts
expect(counts.engineArrayInsert).toBe(5);
expect(counts.engineSingleInsert).toBe(0);
expect(counts.driverBulkCreate).toBe(5);
expect(counts.driverCreate).toBe(0);
expect(await engine.count('qa_seed_item')).toBe(1000);
```

查询保留的 SQLite 数据库，断言全部 1,000 行逐字段一致、键值范围正确、`amount` 总和为 `500500`、`active` 数量为 `500/500`、首行/中间行/末行准确，并且 `PRAGMA integrity_check = ok`。

- [x] **步骤 2：验证 Import 批量写入**

通过 `runImport` 和真实协议层，将准确的 1,000 行 × 4 列 Import 输入加载到 `qa_import_item`，设置 `progressEvery: 200`。断言调用次数同样为 `5/0/5/0`、`created: 1000`、`errors: 0`、全部 1,000 行逐字段一致，并完成与 Seed 相同的 SQLite 汇总及完整性核对。

- [x] **步骤 3：验证单父节点汇总去重**

创建 1 条 `qa_summary_parent`，再用 5 个各含 200 行的数组插入 1,000 条四列子记录。断言子对象 `bulkCreate` 调用 5 次、父对象汇总更新 5 次、全部子记录逐字段一致、落库 1,000 条，并且 `total_amount: 500500`。

- [x] **步骤 4：验证 10 个父节点的汇总去重**

创建 10 条父记录，并循环分配子记录，使每个 200 行批次都包含每个父节点的 20 条子记录。断言子对象 `bulkCreate` 调用 5 次、父对象汇总更新 50 次、全部子记录逐字段一致、落库 1,000 条、每个父节点有 100 条子记录、各父节点准确汇总为 `49600`–`50500`，合计 `500500`。

- [x] **步骤 5：运行聚焦测试并保留原始输出**

执行：

```bash
pnpm --filter @objectstack/rest exec vitest run src/issue-2678-minimal-evidence.test.ts --reporter=verbose
```

将 stdout 和 stderr 保存到 `docs/superpowers/reports/issue-2678-minimal-evidence/run.log`。预期四个证据场景全部通过。无论成功或失败，都保留所有数据库和中间产物；失败运行也是证据，不得覆盖。后续如需重跑，必须在 `runs/` 下使用新的时间戳目录。

### 任务四：持久保存并校验证据包

**文件：**

- 新建：`docs/superpowers/reports/issue-2678-minimal-evidence/objects.json`
- 新建：`docs/superpowers/reports/issue-2678-minimal-evidence/inputs/*.json`
- 新建：`docs/superpowers/reports/issue-2678-minimal-evidence/traces/calls.json`
- 新建：`docs/superpowers/reports/issue-2678-minimal-evidence/results.json`
- 新建：`docs/superpowers/reports/issue-2678-minimal-evidence/SHA256SUMS`

**输入与输出：**

- 输入：实际执行源码、准确生成的数据行、调用次数和 SQLite 查询结果。
- 输出：可与保留数据库交叉核对的持久机器可读证据。

- [x] **步骤 1：保存准确输入和结果**

持久保存全部生成数据、对象定义、环境元数据、断言、有序调用轨迹、计数、首行/中间行/末行样本、汇总核对、SQLite 完整性结果和本地耗时。明确标注耗时仅供参考。

- [x] **步骤 2：保留实际执行源码**

将实际执行的测试内容准确复制到 `evidence.test.ts`，并验证两者逐字节一致。包内测试程序和持久副本均保留。

- [x] **步骤 3：计算持久证据哈希**

对实际执行源码、环境、对象定义、每份输入、每个 SQLite 数据库、原始调用轨迹、结构化结果和日志计算 SHA-256。将输出保存到 `SHA256SUMS`，再使用 `shasum -a 256 -c SHA256SUMS` 进行验证。

### 任务五：编写面向领导的报告

**文件：**

- 新建：`docs/superpowers/reports/issue-2678-minimal-evidence/README.md`

**输入与输出：**

- 输入：任务四生成的机器可读证据，以及已经确认的 issue 分类。
- 输出：不夸大本地 SQLite 证据范围的简明回复。

- [x] **步骤 1：回答四个具体问题**

针对原 issue 的两个问题，分别说明测试环境、基本数据、行列数量和测试组件/对象。明确区分 `4` 个用户输入列、系统生成的 `id` 以及计算汇总字段。

- [x] **步骤 2：说明验收结果和 issue 归属**

说明本地批量写入目标是否通过。暂时性错误重试部分复用现有证据：#2804、#2805 是已确认 bug；#2802 是生产代表性驱动的覆盖边界。将 #2803、#2806 单独列为 PR 引入的正确性回归，不归入原始性能问题或重试问题。

- [x] **步骤 3：说明未覆盖范围**

明确说明本次补充不测试 Turso/libSQL、HotCRM、云端延迟、UI、取消操作、50,000 行或绝对性能。

### 任务六：留存与完整性审计

**文件：**

- 保留：`packages/rest/src/issue-2678-minimal-evidence.test.ts`
- 保留：`docs/superpowers/reports/issue-2678-minimal-evidence/` 下的所有文件
- 保留：专用 worktree 和已安装依赖

**输入与输出：**

- 输入：完整报告、保留的原始产物和已验证哈希。
- 输出：可审计且有意不清理的证据工作区。

- [x] **步骤 1：检查证据完整性**

将领导提出的每个问题及 #2678 的相关验收标准，逐项映射到 `README.md`、`results.json`、`traces/calls.json` 或保留的 SQLite 数据库中的具体字段或产物。记录任何缺口，不得删除或修改失败证据。

- [x] **步骤 2：验证证据哈希**

执行：

```bash
shasum -a 256 -c docs/superpowers/reports/issue-2678-minimal-evidence/SHA256SUMS
```

预期：全部保留证据都能通过哈希验证。本审计步骤不重跑测试。

- [x] **步骤 3：确认遵守“不清理”约束**

确认测试程序、输入、对象定义、数据库、轨迹、日志、结果、哈希、报告、worktree 和依赖目录全部仍然存在。除非用户后续明确要求清理，否则不得删除任何内容。

- [x] **步骤 4：记录仓库产物范围**

运行 `git status --short`，并将输出作为产物清单写入报告。出现未跟踪或生成的证据属于预期情况，不得以保持仓库整洁为理由删除它们。
