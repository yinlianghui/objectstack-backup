# PR #2680 批量写入 QA 执行计划

> **面向执行代理：** 必须使用 `superpowers:executing-plans`，逐任务执行本计划。这是一份纯 QA 计划：不得修改产品代码，不得提交，不得调用 `superpowers:finishing-a-development-branch`。

**目标：** 验证 [issue #2678](https://github.com/objectstack-ai/framework/issues/2678) 与 [PR #2680](https://github.com/objectstack-ai/framework/pull/2680) 是否在当前 `main` 上正确实现；查找 seed、import 与 bulk-write 路径中可复现的 bug，并为每个确认的 bug 创建有证据支撑的 GitHub issue。

**测试架构：** 按由内到外的顺序测试：helper 契约、engine/driver 集成、seed 服务、REST import runner、真实 HTTP 服务，最后是 UI。固定当前 `origin/main` 用于验证用户实际会使用的版本，仅在归因时使用 PR #2680 的 merge commit。临时 harness 与证据文件默认存放在 `/tmp`；只有模块解析或边界观测确实需要时，才在专用 worktree 中创建临时测试、脚本或诊断日志，结束后彻底清理。

**技术栈：** pnpm、Turbo、Vitest、ObjectQL、`@objectstack/driver-sql`、兼容 SQLite/libSQL 的本地存储、ObjectStack showcase 服务、objectui Vite console、Codex 内置无头浏览器、GitHub CLI/app。

## 全局约束

- 只做测试，不实现修复，也不改变产品行为。
- 仓库内只允许保留三类未提交 QA 产物：本计划文件、持续更新的执行报告，以及最终报告需要展示的少量关键截图。不得留下产品源码、永久测试、manifest 或 lockfile 变更。
- 允许创建必要的临时 `.test.ts`、诊断脚本、fixture、日志、数据库、profile 与截图；默认放在 `/tmp/objectstack-pr2680-qa-98874656`。如果模块解析或进程内观测要求放在 `framework`/`objectui`，必须明确标记为临时、不得提交，并在任务 10 中删除或还原。
- 为定位多层调用链问题，允许在现有源码中临时增加纯诊断日志。修改前必须记录 diff；不得夹带修复或行为变化；取得证据后必须还原，并用 `git diff` 确认恢复。
- 使用全新专用 worktree：`/Users/yinlianghui/Documents/GitHub/framework-pr2680-qa-v2`。
- 测试基线固定一次；执行中途不得再拉取远程变更。
- 主测试基线：`98874656ffc50ce1531af52346228ffcdda73fba`（2026-07-10 观察到的 `origin/main`）。
- 归因基线：`21420d9f82ebdcd53a6361ded3d829723bcab18e`（PR #2680 merge commit）。
- 先测试当前 `main`；只有当前 `main` 的失败得到确认后，才在 merge commit 上复测最小用例。
- UI 自动化必须使用 Codex 内置浏览器、无头模式和全新的临时空 profile；不得复用人类浏览器 profile 或已有登录态。
- 最终报告必须展示关键 UI 截图。如果浏览器能力无法同时满足“全新 profile + 无头模式”，将 UI 测试标记为阻塞，不得切换到已有 profile。
- 普通断言失败属于测试发现，不是中止条件；保存证据后继续执行其他独立测试。
- 只有在稳定复现、确认预期行为并搜索重复 issue 后，才能创建或更新 GitHub issue。
- 没有新的命令输出、最终数据库/API 核验和干净 worktree 检查，不得宣称测试成功。
- 完成每个顶层任务（任务 0–9）并保存证据、更新清单后，随机等待 5–10 秒再进入下一任务。可使用 `sleep $((5 + RANDOM % 6))`。该间隔只用于降低连续执行节奏和分隔日志，不作为规避系统审查的手段。
- 不得在每个步骤或测试用例之间机械加入 sleep。服务启动、异步 job、浏览器元素和网络重试必须继续使用基于实际状态的有界等待、`Retry-After` 或指数退避；顶层任务间隔不得替代这些机制。

## 上下文与输出预算

- 对话输出必须极简、增量且拒绝重复。不得重复粘贴计划、已完成任务、已确认约束、完整源码、PR/issue 原文或此前已经报告的结论。
- 每个顶层任务最多发送一条开始更新和一条完成摘要；只有确认 bug、阶段阻塞或需要用户决策时才增加更新。普通测试用例逐项通过时不发送单独消息。
- 所有构建、测试、服务和浏览器完整日志必须写入 `/tmp/objectstack-pr2680-qa-98874656`。成功时对话中只报告命令标识、退出码、测试数量、耗时和证据文件路径。
- 禁止把完整 build/test 输出注入对话。运行长命令时将 stdout/stderr 重定向到证据日志；完成后只读取总结行。失败时先保存完整日志，再用 `rg`、`tail` 或精确行范围提取与根因相关的最小片段。
- 单次失败片段默认不超过 80 行；若仍不足以定位，再按假设读取下一段，不得反复读取同一完整日志。
- 每个确认或疑似问题只维护一份 canonical finding 文件。后续任务只引用 finding ID/路径，不重复描述全部复现内容。
- 每完成一个顶层任务，必须更新 `/tmp/objectstack-pr2680-qa-98874656/summary/test-matrix.md`，并同步更新持久化执行报告 `docs/superpowers/reports/2026-07-11-pr-2680-bulk-write-qa-report.md`。报告记录任务状态、关键计数、finding ID、issue 链接、下一任务及仍在运行的 PID，不复制完整日志。
- 如果发生上下文压缩、模型恢复或任务续跑，只读取计划的当前任务、最新检查点、测试矩阵和相关 finding；不得重新读取全部历史日志或重新汇报已完成任务。
- 浏览器原始/诊断截图统一放 `/tmp/objectstack-pr2680-qa-98874656/screenshots`；相同页面或状态不重复截图。最终报告需要的少量关键截图复制到 `docs/superpowers/reports/assets/pr2680/`，同时在聊天窗口展示并在执行报告中引用。
- 极简输出不得削弱验证：完整证据保存在磁盘，GitHub issue 仍必须包含充分的最小复现、预期/实际行为和证据引用。

## 网络、Timeout 与断线恢复

- 任何单次阻塞等待不得超过 60 秒。构建、完整测试、服务和性能测试等长命令必须使用可恢复的后台/PTY session，并将完整输出实时写入证据日志。
- 启动长命令前记录命令、PID/session ID、日志路径、开始时间和所属测试 ID。每次只进行 15–30 秒的短轮询；轮询无新输出不代表失败。
- 工具或客户端返回 Timeout 后，不得立即重跑命令。先检查原 PID/session、日志尾部、端口和数据库状态，判断原命令仍在运行、已经成功、已经失败还是状态未知，避免产生重复写入或重复测试。
- 服务就绪使用 health endpoint、端口和进程状态的有界轮询；浏览器使用元素/页面状态等待；不得用一个覆盖整个阶段的超长固定 timeout。
- 幂等读取请求可以在连接超时或 5xx 后最多重试 3 次，并采用指数退避。导入、createMany、undo、取消、创建 issue 等写操作不得因网络超时盲目重试；必须先通过数据库、job ID、外部键或 GitHub 搜索确认是否已经生效。
- GitHub issue 正文在发送前保存到 finding/报告；创建请求超时后先按标题、finding ID 和时间搜索是否已创建，再决定是否重试，防止重复 issue。
- 每个长命令完成后立即更新执行报告检查点，而不是等整个顶层任务结束。断线或新模型恢复时，从最后一个已确认检查点继续，不得从任务开头重跑。
- 如果 Codex 客户端断开但本地进程仍运行，恢复后优先接管/检查原进程。只有确认原进程已停止或不可恢复时，才重新启动。

## Superpowers 工作流适配

- `superpowers:brainstorming`：已通过此前的需求/设计讨论及用户对测试结构的批准完成。
- `superpowers:writing-plans`：负责本文件中的精确命令、预期结果、证据要求和停止规则。
- `superpowers:using-git-worktrees`：已用于从固定 SHA 创建全新专用 worktree；执行前再次核验隔离状态，不再创建重复 worktree。
- `superpowers:executing-plans`：执行阶段必须使用；先完整审阅本文件，再跟踪每个任务。
- `superpowers:systematic-debugging`：每次失败后、确认 bug 或提出根因前必须使用。
- `superpowers:verification-before-completion`：最终报告前必须使用。
- `superpowers:finishing-a-development-branch`：本任务没有实现提交或 PR，因此明确不适用。
- 如果仓库注册的 `dogfood-verification` skill 的 `SKILL.md` 恢复可读，必须使用；如果仍不可用，则直接遵循 `AGENTS.md` 的 dogfood 和浏览器规则，并记录该限制。

## 证据目录与命名

执行时创建并优先使用以下临时证据根目录：

```text
/tmp/objectstack-pr2680-qa-98874656/
  commands/        # 完整命令输出与退出码
  db/              # 一次性数据库
  fixtures/        # 生成的 CSV/JSON 数据
  logs/            # 服务、Vite、观测与故障注入日志
  screenshots/     # 浏览器截图
  findings/        # 每个疑似/确认发现一份 markdown 记录
  harness/         # 仓库外的临时 tsx 断言/观测程序
  summary/         # 测试矩阵与最终统计
```

每份发现记录必须包含：测试 ID、commit、精确复现步骤、预期依据、实际结果、数据库状态、相关日志片段、复现次数、根因范围、重复 issue 搜索结果，以及 issue URL/状态。

持久化、可在上下文压缩或新会话中恢复的执行状态写入：

```text
docs/superpowers/reports/2026-07-11-pr-2680-bulk-write-qa-report.md
docs/superpowers/reports/assets/pr2680/   # 仅最终代表性截图
```

计划文件描述“要做什么”，执行报告描述“已经做了什么和得到什么结论”。不得把完整日志或逐命令输出追加到计划文件。

如需仓库内临时文件，统一使用易识别的 `*.qa.test.ts`、`*.qa.ts` 或 `.tmp/pr2680-qa/**` 命名，并在命令台账中登记创建、修改和清理时间。最终状态中只允许保留本计划文件。

---

## 任务 0：计划审查门禁与固定基线

**文件：**
- 读取：`AGENTS.md`
- 读取：`packages/core/src/utils/bulk-write.ts`
- 读取：`packages/metadata-protocol/src/seed-loader.ts`
- 读取：`packages/rest/src/import-runner.ts`
- 读取：`packages/metadata-protocol/src/protocol.ts`
- 读取：`packages/objectql/src/engine.ts`
- 读取：`packages/plugins/driver-sql/src/sql-driver.ts`
- 临时创建：`/tmp/objectstack-pr2680-qa-98874656/**`

**接口：**
- 输入：issue #2678 的验收条件和 PR #2680 的实现声明。
- 输出：固定 SHA、干净 worktree 证据、源码到测试的追踪矩阵。

- [ ] **步骤 1：执行前严格审阅本计划**

  确认每条 issue 验收条件至少映射到一个测试 ID，并确认探索性测试与必需验收测试分别标识。

- [ ] **步骤 2：核验 worktree 隔离和固定 SHA**

  运行：

  ```bash
  git rev-parse --show-toplevel
  git rev-parse --git-dir
  git rev-parse --git-common-dir
  git branch --show-current
  git rev-parse HEAD
  git status --short
  git merge-base --is-ancestor 21420d9f82ebdcd53a6361ded3d829723bcab18e HEAD
  ```

  预期：路径为 `/Users/yinlianghui/Documents/GitHub/framework-pr2680-qa-v2`；分支为 `codex/pr2680-qa-v2`；HEAD 为 `98874656...`；创建临时 QA 文件前，状态中只有本次要求的未跟踪计划路径；merge-base 命令退出码为 0。

- [ ] **步骤 3：创建证据根目录和命令台账**

  运行：

  ```bash
  mkdir -p /tmp/objectstack-pr2680-qa-98874656/commands
  mkdir -p /tmp/objectstack-pr2680-qa-98874656/db
  mkdir -p /tmp/objectstack-pr2680-qa-98874656/fixtures
  mkdir -p /tmp/objectstack-pr2680-qa-98874656/logs
  mkdir -p /tmp/objectstack-pr2680-qa-98874656/screenshots
  mkdir -p /tmp/objectstack-pr2680-qa-98874656/findings
  mkdir -p /tmp/objectstack-pr2680-qa-98874656/harness
  mkdir -p /tmp/objectstack-pr2680-qa-98874656/summary
  ```

  在相应证据记录中保存后续每条命令的开始/结束时间、退出码和基线 SHA。不得将证据文件加入 Git。

- [ ] **步骤 4：建立验收追踪矩阵**

  必须包含以下映射：

  | #2678 验收条件 | 必需测试 |
  |---|---|
  | Seed/import 使用共享 bulk helper | CORE-01、SEED-01、IMP-01 |
  | 写入次数约为 `ceil(N/batch)` | CORE-01、SEED-01、IMP-01、PERF-01 |
  | 瞬时错误得到重试 | CORE-03/04、SEED-06/08、IMP-10/11 |
  | 逻辑错误按行隔离 | CORE-05、SEED-05、IMP-09 |
  | 汇总重算受唯一父记录数约束 | SEED-10、PERF-02 |
  | 结果顺序无回归 | CORE-06、IMP-05 |

- [ ] **步骤 5：应用执行停止规则**

  仅在以下情况停止受影响阶段：基线无法解释、故障注入无法隔离、指令存在关键歧义、执行越出测试工作区，或进程/资源无界增长。保存证据并继续所有独立阶段。不得仅因发现 bug 而停止。

---

## 任务 1：环境预检

**文件：**
- 读取：`package.json`
- 读取：受测 package 对应的 `packages/*/package.json`
- 读取：`../objectui/AGENTS.md`
- 读取：`../objectui/package.json`
- 证据：`/tmp/objectstack-pr2680-qa-98874656/commands/preflight-*`

**接口：**
- 输入：任务 0 固定的 worktree。
- 输出：可信的构建/测试/服务/浏览器基线，或明确标记为阻塞的子阶段。

- [ ] **步骤 1：记录运行时和依赖状态**

  运行：

  ```bash
  node --version
  pnpm --version
  pnpm install --frozen-lockfile
  ```

  预期：Node 和 pnpm 输出版本；安装命令退出码为 0，且 lockfile 不发生变化。

- [ ] **步骤 2：执行一次全新完整构建**

  运行：

  ```bash
  pnpm build
  ```

  预期：Turbo 退出码为 0。如果失败，记录所有失败 package 名称和完整错误。仅当失败 package 位于服务/UI 的依赖链中时，才阻塞相应测试。

- [ ] **步骤 3：核验构建后的工作区清洁度**

  运行：

  ```bash
  git status --short
  ```

  预期：只有本次要求的计划文件，以及明确命名的临时 QA 文件。若出现已跟踪文件差异，应先证明其由构建生成，再作为环境/构建发现处理并还原。

- [ ] **步骤 4：检查服务端口和相邻 UI 仓库**

  运行：

  ```bash
  lsof -nP -iTCP:3000 -sTCP:LISTEN
  lsof -nP -iTCP:5180 -sTCP:LISTEN
  test -f ../objectui/package.json
  test -d ../objectui/node_modules
  git -C ../objectui status --short
  ```

  预期：端口空闲；如存在监听者，应在替换前明确识别；objectui 文件与依赖存在；已有 objectui 变更被记录且不触碰。

- [ ] **步骤 5：启动一次性后端进行 API 预检**

  通过文档规定的脚本，在固定高位测试端口启动 showcase：

  ```bash
  pnpm dev -- --fresh -p 38421
  ```

  预期：先确认 38421 端口空闲；服务完成启动并打印 seed admin 凭据；`/api/v1/health` 成功；登录成功；import 路由已注册。记录 PID 和端口；检查完成后仅停止该进程。

- [ ] **步骤 6：在不打开用户 profile 的前提下核验浏览器能力**

  初始化 Codex 内置浏览器，确认它能提供全新的无头临时 context/profile 并支持截图。如果可用浏览器无法证明同时满足无头模式和临时空 profile，则将 UI 任务标记为阻塞，不得改用 Chrome 或已有 profile。

- [ ] **步骤 7：给出预检结论**

  分别将以下各层标记为 `ready`、`blocked` 或 `failed-baseline`：helper 测试、SQL driver、seed 服务、REST 集成、真实后端、objectui、浏览器。继续执行所有 `ready` 层。

---

## 任务 2：现有自动化基线

**文件：**
- 测试：`packages/core/src/utils/bulk-write.test.ts`
- 测试：`packages/rest/src/import-runner-bulk.test.ts`
- 测试：`packages/rest/src/import-integration.test.ts`
- 测试：`packages/rest/src/import-job-integration.test.ts`
- 测试：`packages/runtime/src/seed-loader.test.ts`
- 测试：`packages/runtime/src/http-dispatcher.test.ts`

**接口：**
- 输入：任务 1 中达到 build/test-ready 状态的层。
- 输出：基线通过/失败台账，以及与既有失败的区分结论。

- [ ] **步骤 1：逐个运行 PR 专项测试**

  运行：

  ```bash
  pnpm --filter @objectstack/core exec vitest run src/utils/bulk-write.test.ts
  pnpm --filter @objectstack/rest exec vitest run src/import-runner-bulk.test.ts
  pnpm --filter @objectstack/rest exec vitest run src/import-integration.test.ts
  pnpm --filter @objectstack/rest exec vitest run src/import-job-integration.test.ts
  pnpm --filter @objectstack/runtime exec vitest run src/seed-loader.test.ts src/http-dispatcher.test.ts
  ```

  预期：每条命令退出码为 0。不仅记录退出码，还要记录测试数量和耗时。

- [ ] **步骤 2：运行受影响 package 的完整测试套件**

  每个套件单独执行，避免一个失败掩盖后续套件：

  ```bash
  pnpm --filter @objectstack/core test
  pnpm --filter @objectstack/metadata-protocol test
  pnpm --filter @objectstack/objectql test
  pnpm --filter @objectstack/driver-sql test
  pnpm --filter @objectstack/rest test
  pnpm --filter @objectstack/runtime test
  pnpm --filter @objectstack/dogfood test
  ```

  预期：每个 package 的退出码均为 0。发生失败时调用 systematic debugging：阅读完整堆栈、精确复现两次、检查近期变更，完成分类后再继续。

- [ ] **步骤 3：记录基线暴露的覆盖缺口**

  确认现有测试是否直接覆盖：真实 SQL 批量写、seed 瞬时重试、自引用重试、汇总重算次数、context 传递、结果数量契约、响应丢失幂等性、fallback protocol，以及同文件引用。缺少测试本身属于覆盖缺口，不直接等同于运行时 bug。

---

## 任务 3：共享 `bulkWrite` 契约与故障模型

**文件：**
- 读取：`packages/core/src/utils/bulk-write.ts`
- 临时 harness：`/tmp/objectstack-pr2680-qa-98874656/harness/bulk-write.qa.ts`
- 证据：`/tmp/objectstack-pr2680-qa-98874656/logs/core-*`

**接口：**
- 输入：`bulkWrite`、`withTransientRetry` 和 `defaultIsTransientError` 的公开行为。
- 输出：经过验证的批处理、重试、降级、数量契约和幂等性发现。

- [ ] **步骤 1：在不修改产品代码的情况下创建临时 QA harness**

  使用 `apply_patch` 在仓库外创建 harness。它必须通过绝对路径导入真实 helper，并观测 `writeBatch`、`writeOne`、sleep 时长、已提交行 ID、返回行位置和故障注入的 attempt 编号。任务 10 中删除。

- [ ] **步骤 2：验证批次边界调用次数（CORE-01）**

  使用 batch size 200 测试行数 `0, 1, 199, 200, 201, 399, 400, 401, 1000`。

  预期 batch 调用次数：`0, 1, 1, 1, 2, 2, 2, 3, 5`；`writeOne` 始终为零；每个结果的 index 和 record 都与输入对应。

- [ ] **步骤 3：验证选项下限钳制（CORE-02）**

  测试省略选项、`batchSize=1`、`batchSize=0`、负 batch size、`maxRetries=1`、`maxRetries=0` 和空输入。

  预期：batch/retry 最小值被钳制为 1；空输入不调用任何 writer；不出现死循环。

- [ ] **步骤 4：验证瞬时错误分类（CORE-03）**

  断言以下错误属于瞬时错误：`fetch failed`、各种 timeout、`ECONNRESET`、`ECONNREFUSED`、`EPIPE`、`EAI_AGAIN`、`socket hang up`、connection closed/reset/aborted、502/503/504、service unavailable、too many connections。

  断言 NOT NULL、CHECK、UNIQUE、validation、authorization、object-not-found 和普通应用错误不属于瞬时错误。

- [ ] **步骤 5：验证重试与降级（CORE-04/05）**

  覆盖：首次失败后恢复、第三次尝试恢复、batch 持续瞬时失败后逐行写成功、一个逻辑坏行、逐行持续瞬时失败，以及单行 batch 失败。

  预期：默认最多尝试 3 次；batch 重试成功后不进行逐行降级；逻辑坏行不影响同批其他行；单行 batch 不调用多余 writer。

- [ ] **步骤 6：验证位置与数量契约（CORE-06）**

  注入以下 batch 返回值：数量不足、数量过多、顺序反转、`undefined`、非数组。

  预期产品要求：没有对应返回 record 时不得将行报告为成功；不得静默错配 ID。如果实现违反该要求，复现两次，并判断 protocol 契约是否在边界上得到充分强制。

- [ ] **步骤 7：验证响应丢失时的幂等性风险（CORE-07）**

  模拟第 1 次尝试已提交记录，随后抛出 `fetch failed`；分别使用自动生成 ID 和调用方提供 ID 的方式重试相同逻辑行。

  预期安全属性：当存储中存在重复记录，或已提交记录被报告为失败时，最终 summary 不得宣称一次干净成功。记录实际行为；issue #2678 要求重试，但没有明确提供 exactly-once 语义。

- [ ] **步骤 8：运行并保存结果**

  运行：

  ```bash
  pnpm exec tsx /tmp/objectstack-pr2680-qa-98874656/harness/bulk-write.qa.ts
  ```

  预期：表达预期需求的断言要么通过，要么生成隔离良好的发现。不得为了迎合当前实现而弱化失败的预期。

---

## 任务 4：真实 SQL 与 Seed Loader

**文件：**
- 读取：`packages/metadata-protocol/src/seed-loader.ts`
- 读取：`packages/objectql/src/engine.ts`
- 读取：`packages/plugins/driver-sql/src/sql-driver.ts`
- 临时 harness：`/tmp/objectstack-pr2680-qa-98874656/harness/seed-sql.qa.ts`
- 证据：`/tmp/objectstack-pr2680-qa-98874656/db/seed-*`

**接口：**
- 输入：真实 ObjectQL engine、真实 SQL driver、seed metadata/service。
- 输出：真实数据库记录、调用次数、汇总重算次数和 seed 结果摘要。

- [ ] **步骤 1：构建真实 driver 临时 harness**

  使用 `apply_patch` 创建仓库外的 `tsx` harness，通过绝对路径导入 workspace 源码/package。注册覆盖普通行、类型字段、父子汇总、自引用、跨对象循环引用、租户字段和校验约束的最小对象。仅包装 driver 方法以统计调用并注入选定故障；所有成功操作仍委托真实实现。

- [ ] **步骤 2：验证普通 seed 批次边界（SEED-01）**

  分别加载 `1, 199, 200, 201, 400, 1000` 条无自引用的 insert 记录。

  预期 engine 写调用次数：`1, 1, 1, 2, 2, 5`。注意末尾单条记录可能按设计使用单记录 engine 路径；应断言文档规定的 engine 调用边界和实际记录数，不要错误要求每次调用都必须是 `bulkCreate`。

- [ ] **步骤 3：验证 SQL ID 行为一致性（SEED-02）**

  覆盖显式 `id`、仅 `_id`、两者都没有、`id:null`、重复 ID，以及同一 batch 内混合 ID 风格。

  预期：行为与单条 `create()` 语义一致；成功行拥有稳定、唯一且可引用的 ID。`id:null` 应依据已建立的单条创建契约判断，不自行发明预期。

- [ ] **步骤 4：验证写入序列化行为一致性（SEED-03）**

  批量写入 JSON、location `{lat,lng}`、boolean、date/datetime、multi-select、null 和 Unicode 值；将返回形状及回读形状与单条 create 对比。

  预期：没有 SQLite binder 失败，没有字符串/对象形状不一致，也没有整批静默丢失。这同时回归验证 #2680 之后的修复 #2745。

- [ ] **步骤 5：验证全部 seed 模式（SEED-04）**

  针对已知既有记录运行 insert、update、upsert、ignore、replace 和 dry-run。

  预期：inserted/updated/skipped/errored 计数与最终记录完全一致；dry-run 不写入任何数据。

- [ ] **步骤 6：验证逻辑 batch 失败隔离（SEED-05）**

  在其他均有效的记录中放入一条 NOT NULL、CHECK、UNIQUE、类型校验或 validation-rule 失败记录。

  预期：batch 失败后降级为逐行写；只有无效行失败；错误报告原始 dataset index/external ID；有效数据库记录与结果摘要一致。

- [ ] **步骤 7：验证普通瞬时错误重试（SEED-06）**

  注入：首次 bulk 失败后成功；bulk 连续三次失败后逐行成功；两个层级都持续失败；update 首次失败后成功。

  预期：可恢复记录不会丢失；attempt 次数符合策略；最终错误在 `SeedLoaderResult` 中可见。

- [ ] **步骤 8：验证自引用写入顺序（SEED-07）**

  使用自然键加载 `Alice`、`Bob.manager=Alice`、`Carol.manager=Bob`。

  预期：严格顺序写入；manager 字段使用真实 ID；不因 batching 产生 unresolved/deferred reference。

- [ ] **步骤 9：验证自引用路径的瞬时错误行为（SEED-08）**

  分别在 Alice、Bob 和 update 模式自引用 dataset 的第一次尝试中注入瞬时错误。

  根据 #2678 的广义表述，瞬时 seed 写入不应静默丢行。记录有意保留的顺序路径是否重试；如果没有，判断这是验收缺口还是明确限定的例外。

- [ ] **步骤 10：验证循环引用与 deferred 写入（SEED-09）**

  启用 multi-pass，加载 A 引用 B、B 引用 A 的对象；在 deferred update 中注入瞬时错误。

  预期：引用成功解析；deferred reference 计数最终归零；瞬时 update 行为明确。如果 deferred-update 错误被吞掉却返回 `success:true`，必须按 issue 级别调查。

- [ ] **步骤 11：验证汇总重算去重（SEED-10）**

  测试：1000 个子记录指向同一父记录；1000 个子记录分布于多个父记录；同一父记录跨越多个 batch。统计 recompute 调用/父 ID，并验证持久化总值。

  预期：每个 batch 内每个唯一父记录重算一次，而不是每个子记录一次。允许跨 batch 重复，因为 issue #2678 将整次 load 合并重算标为可选项。

- [ ] **步骤 12：验证租户与自动化 context（SEED-11）**

  覆盖显式 organization、单 organization fallback、平台对象、`isSystem` 和 `skipTriggers`。

  预期：不存在跨租户 lookup/upsert；平台记录不会错误附加业务租户标记；seed 不触发自动化副作用。

- [ ] **步骤 13：验证依赖顺序与错误停止行为（SEED-12）**

  测试拓扑排序的多 dataset load、首个 dataset 失败、`haltOnError`，以及只在 buffered flush 时发现的失败。

  预期：后续 dataset 的执行符合文档定义的停止语义；没有未 flush 的记录或遗漏错误；所有对象级统计之和等于全局统计。

- [ ] **步骤 14：运行完整 seed QA harness**

  运行：

  ```bash
  pnpm exec tsx /tmp/objectstack-pr2680-qa-98874656/harness/seed-sql.qa.ts
  ```

  预期：同时记录数据库状态断言和观测调用次数；仅 mock 通过不足以完成验收。

---

## 任务 5：Import Runner 与真实 REST 集成

**文件：**
- 读取：`packages/rest/src/import-runner.ts`
- 读取：`packages/rest/src/rest-server.ts`
- 读取：`packages/metadata-protocol/src/protocol.ts`
- 临时 harness：`/tmp/objectstack-pr2680-qa-98874656/harness/import.qa.ts`
- 证据：`/tmp/objectstack-pr2680-qa-98874656/logs/import-*`

**接口：**
- 输入：真实 engine/protocol/routes，以及用于兼容性和故障场景的受控 protocol wrapper。
- 输出：逐行结果、progress/cancel/undo 证据、context 轨迹和数据库核验结果。

- [ ] **步骤 1：验证同步 import 边界（IMP-01）**

  使用 `1, 199, 200, 201, 400, 1000, 5000` 行调用真实 `/api/v1/data/:object/import` 路由。

  预期：默认 progress 配置下，createMany 调用次数为 `ceil(N/200)`；数据库记录数和结果数准确；行号有序。

- [ ] **步骤 2：验证异步 import job（IMP-02）**

  针对有效数据、混合失败以及 50,000/50,001 边界，验证 create、polling、results、list、cancellation 和终止状态。

  预期：持久化 job 计数与实际数据库/结果一致；终止 job 仍可读取；大小限制返回文档规定的错误。

- [ ] **步骤 3：验证直接 `createMany` 路由（IMP-03）**

  使用真实 context/environment 值和类型字段调用 `/api/v1/data/:object/createMany`。

  预期：路由已接通；context 到达 `engine.insert`；返回 ID；SQL 序列化与单条 create 一致；安全行为与对应单记录路由一致。

- [ ] **步骤 4：验证 import 模式（IMP-04）**

  覆盖 insert、update、upsert、dry-run、空 match key、歧义匹配、无匹配，以及 create/update 交错决策。

  预期：created/updated/skipped/errors 统计和最终记录完全准确；dry-run 不改变数据库。

- [ ] **步骤 5：验证结果顺序与数量（IMP-05）**

  按以下顺序输入决策：create、update、coercion 失败、create、skipped、update、create；同时注入数量不足或顺序改变的 `createManyData` 响应。

  预期：结果保持原始输入顺序；每个已处理输入恰好对应一个真实结果；缺失返回记录不得变成虚假成功。

- [ ] **步骤 6：验证 progress 与 flush 边界（IMP-06）**

  使用跨越多个边界的数据测试 `progressEvery=1,50,100,200,500,1000`。

  预期：write chunk 永不超过 200；每次 progress callback 都能观察到 `processed` 之前的全部写入；最终统计不包含已 buffer 但尚未写入的记录。

- [ ] **步骤 7：验证协作式取消（IMP-07）**

  分别在第一个和第二个 progress 边界请求取消。

  预期：该边界之前的 pending create 已 flush；后续记录不存在；`results.length===processed`；job 状态、计数和数据库一致。

- [ ] **步骤 8：验证 undo log 与 undo 路由（IMP-08）**

  运行一个更新 1 行、创建 2 行的 upsert job，然后执行 undo。

  预期：创建记录的 ID 被删除；更新记录只恢复被触碰字段；未触碰的并发字段保持不变；缺失返回 ID 不得静默产生无法撤销的记录。

- [ ] **步骤 9：验证逻辑错误降级（IMP-09）**

  使用真实 SQL 约束，在 200 行 create batch 中放入一条无效记录。

  预期：199 条有效记录持久化；无效行保留原始 CSV 行号，并包含有意义的 code/message；total/ok/errors 与数据库一致。

- [ ] **步骤 10：按写入路径验证瞬时错误（IMP-10）**

  分别向 `createManyData`、`updateData` 和降级后的 `createData` 路径注入可恢复与持续性的瞬时错误。

  预期：每条路径的行为都得到明确验证；不得根据 bulk 路径推断 fallback 路径会重试。

- [ ] **步骤 11：验证没有 `createManyData` 的 protocol（IMP-11）**

  运行一个只实现 `findData/createData/updateData` 的兼容 protocol，并注入一次瞬时 create 失败。

  根据兼容性承诺，预期保留原逐行语义。判断“不重试”属于明确兼容边界，还是 #2678 的可靠性缺口。

- [ ] **步骤 12：验证同文件内引用（IMP-12）**

  导入包含 `Alice`、`Bob.manager=Alice`、`Carol.manager=Bob` 的自引用 CSV；同时测试首次 not-found 被缓存后的重复引用。

  兼容性预期依据：对比当前 `main`、#2680 merge commit 和 #2680 之前的父 commit。如果旧逐行路径能解析先前导入行，而 buffering 后不能，则归类为执行时序回归。

- [ ] **步骤 13：验证 context 与 automation（IMP-13/14）**

  使用两个 organization/environment，并覆盖 `runAutomations` 的两个取值。

  预期：不存在跨租户 match/reference；context 到达 bulk engine insert；automation 次数/副作用与逐行语义一致。

- [ ] **步骤 14：验证 CSV 解析边界（IMP-15）**

  覆盖 UTF-8 中文、BOM、引号内逗号/换行、空白、配置的 null token、空输入、重复列、无效映射、数字、日期、boolean、select 和 lookup。

  预期：解析/coercion 失败只影响对应行或请求，不得破坏 batch 中无关记录。

- [ ] **步骤 15：运行 import QA harness**

  运行：

  ```bash
  pnpm exec tsx /tmp/objectstack-pr2680-qa-98874656/harness/import.qa.ts
  ```

  预期：每个场景都同时断言响应和数据库状态；观测程序记录准确的 batch/fallback/retry 次数。

---

## 任务 6：真实 Showcase API

**文件：**
- 读取：`examples/app-showcase/**` 中相关 object/seed metadata
- 测试数据：`/tmp/objectstack-pr2680-qa-98874656/fixtures/*.csv`
- 日志：`/tmp/objectstack-pr2680-qa-98874656/logs/showcase-*`

**接口：**
- 输入：已构建 package 和真实 HTTP 服务。
- 输出：独立于进程内路由测试的端到端 HTTP 证据。

- [ ] **步骤 1：在 3000 端口启动全新 showcase 后端**

  运行：

  ```bash
  PORT=3000 pnpm dev -- --fresh
  ```

  预期：只有本任务占用 3000 端口；seed admin 可用；启动日志中没有 seed 写入失败。记录 PID 和凭据，但不得在 GitHub issue 中暴露凭据。

- [ ] **步骤 2：认证并盘点真实可导入对象**

  使用 REST 登录和 metadata 端点。选择覆盖普通字段、lookup、类型化 object/JSON/location、validation、租户字段和 summary 关系的对象。不得凭记忆假设 showcase 标签。

- [ ] **步骤 3：生成确定性 fixture**

  生成以下 CSV：5 行 smoke、201 行边界、1000 行性能、混合 upsert、单个无效行、lookup、metadata 支持时的同文件自引用，以及异步规模数据。包含稳定 external key 以便数据库对账。

- [ ] **步骤 4：验证同步、异步和直接 createMany HTTP 端点**

  对每个 fixture 记录请求形状、状态码、响应 summary/results、耗时和写入后的查询结果。

  预期：真实服务行为与任务 5 一致。进程内路径与真实 HTTP 路径之间的差异应成为需要边界追踪的发现。

- [ ] **步骤 5：验证重启持久化和 seed-once 行为**

  仅停止步骤 1 启动的服务；在支持的情况下使用同一一次性状态重启，并验证导入记录和 seed stamp 符合文档。不得把 `--fresh` 重启误当作持久化验证。

- [ ] **步骤 6：停止真实后端并确认端口释放**

  预期：已记录 PID 退出；在 UI 启动或清理前，`lsof -nP -iTCP:3000 -sTCP:LISTEN` 不返回监听进程。

---

## 任务 7：无头 UI CSV Dogfood

**文件：**
- 读取：`../objectui/AGENTS.md`
- 测试数据：`/tmp/objectstack-pr2680-qa-98874656/fixtures/ui-*.csv`
- 截图：`/tmp/objectstack-pr2680-qa-98874656/screenshots/*.png`

**接口：**
- 输入：3000 端口上的全新后端、5180 端口上的 objectui dev server、全新的内置无头浏览器 profile。
- 输出：UI 工作流截图，以及 API/数据库对账结果。

- [ ] **步骤 1：启动后端和 objectui dev server**

  在 3000 端口使用全新一次性状态启动后端，然后运行：

  ```bash
  cd ../objectui
  DEV_PROXY_TARGET=http://localhost:3000 pnpm --filter @object-ui/console dev
  ```

  预期：Vite 监听 5180；`/api` 能到达本任务后端。记录两个 PID。

- [ ] **步骤 2：打开全新的内置无头浏览器 context**

  访问 `http://localhost:5180`，使用全新 seed admin 登录，并确认浏览器 context 中没有旧的应用存储/cookie。

  预期：不借用任何已有会话即可登录成功。

- [ ] **步骤 3：探索 UI import 工作流**

  通过可见 UI 导航至一个可导入对象，定位真实存在的 upload、mapping、mode、automation、preview/progress、results、job history/cancel 和 undo 界面。

  预期：记录准确的可见标签和缺失控件；不得推断 UI 中不存在的能力。

- [ ] **步骤 4：执行 5 行 smoke import（UI-01）**

  完成上传、映射、预览、执行，并核验列表/API/数据库状态。截取 upload、mapping、progress/result 和最终列表页面。

- [ ] **步骤 5：执行 201 行边界 import（UI-02）**

  预期：没有进度卡死、重复提交或总数 off-by-one；得到 201 条真实结果和相符记录。

- [ ] **步骤 6：执行混合 upsert 与无效行 import（UI-03）**

  预期：created/updated/skipped/errors 和原始 CSV 行号与 API/数据库证据一致。

- [ ] **步骤 7：执行 lookup 与同文件引用 import（UI-04）**

  预期：普通 lookup 行为与 API 测试一致；任何时序失败都同时保留 UI 和后端证据，且不为同一根因创建重复 issue。

- [ ] **步骤 8：执行异步大文件 import UI 工作流（UI-05）**

  如果 UI 暴露该能力，验证 job 创建、progress、页面刷新、results、cancel 和 undo。如果未暴露，记录为 UI 覆盖边界，不自动判断为 bug。

- [ ] **步骤 9：验证 automation 选项传递（UI-06）**

  对比 automation 开启/关闭时的浏览器网络请求和后端观测到的 context。

- [ ] **步骤 10：停止服务并关闭/删除临时浏览器 profile**

  预期：3000/5180 端口释放；仅停止已记录 PID；截图保留到最终报告完成。

---

## 任务 8：性能、可靠性与范围边界

**文件：**
- 证据：`/tmp/objectstack-pr2680-qa-98874656/logs/perf-*`
- 摘要：`/tmp/objectstack-pr2680-qa-98874656/summary/performance.md`

**接口：**
- 输入：带观测的 seed/import 测试和真实 HTTP 运行结果。
- 输出：调用次数证明、相对耗时、资源观测和明确的“不作此结论”说明。

- [ ] **步骤 1：证明写调用次数下降（PERF-01）**

  对 1000 条普通 create，记录 helper batch、engine insert、driver bulk create、fallback 单条 create 和最终持久化记录数。

  预期：batch size 200 时约有 5 次 engine batch 写入，且没有意外进入逐行路径。

- [ ] **步骤 2：证明 summary-recompute 上界（PERF-02）**

  记录每个 batch 的唯一 parent ID 和 recompute 调用。

  预期：recompute 次数受每个 batch 的唯一父记录数约束；不得宣称整次 load 只重算一次。

- [ ] **步骤 3：比较本地相对耗时（PERF-03）**

  经过 warm-up 和多次重复运行，对比 1000 行单条写基线与 batch 路径，并分别覆盖有/无 summary。

  预期：报告中位数和环境；耗时仅作为辅助证据；不得将本地毫秒数外推为 Turso 延迟。

- [ ] **步骤 4：观测资源边界（PERF-04）**

  检查峰值内存、CPU、SQL 参数数量、日志增长和 50,000 行 import-job 行为。

  预期：没有失控进程或无界证据生成。资源失败只能停止受影响的规模测试。

- [ ] **步骤 5：记录只能在云环境验证的未测项**

  明确列出：真实 Turso/libSQL 错误对象、远程已提交但响应丢失的行为、云连接池限制、冷启动、HotCRM 事故环境和远程绝对延迟。这些项目不得标记为通过或失败。

---

## 任务 9：系统化发现分诊与 GitHub Issue

**文件：**
- 发现记录：`/tmp/objectstack-pr2680-qa-98874656/findings/*.md`

**接口：**
- 输入：每个失败断言、意外日志、UI/API/数据库不一致或被阻塞的结论。
- 输出：确认 bug、既有 issue 更新、测试缺口记录、未验证风险记录或环境发现。

- [ ] **步骤 1：在当前 `main` 上复现每个候选问题**

  最小用例至少运行两次。记录精确输入、输出、数据库状态、attempt 次数和日志。

- [ ] **步骤 2：提出任何修复前先追踪根因**

  沿 UI/request → runner → protocol → engine → driver → 数据库追踪数据。对比最接近的正常路径，识别行为首次发生偏差的边界。

- [ ] **步骤 3：建立预期行为依据**

  引用 #2678 验收文字、#2680 声明的行为、仓库文档/测试或变更前行为。如果不存在权威预期，则归类为设计问题/风险，而不是确认 bug。

- [ ] **步骤 4：对回归进行归因**

  创建一次性 detached 归因 worktree，并只复测最小用例：

  ```bash
  git worktree add --detach ../framework-pr2680-attribution 21420d9f82ebdcd53a6361ded3d829723bcab18e
  pnpm -C ../framework-pr2680-attribution install --frozen-lockfile
  ```

  如果执行时序很重要，则在 merge commit 的第一父 commit 上创建第二个 detached worktree 重复测试。记录当前 `main` 是修复、保留还是引入了问题；任务 10 中删除归因 worktree。

- [ ] **步骤 5：搜索重复 issue**

  执行以下聚焦搜索：

  ```bash
  gh issue list --repo objectstack-ai/framework --state all --search "bulkWrite transient retry"
  gh issue list --repo objectstack-ai/framework --state all --search "createManyData import"
  gh issue list --repo objectstack-ai/framework --state all --search "seed loader bulkCreate"
  gh issue list --repo objectstack-ai/framework --state all --search "same file import lookup reference"
  ```

  如果这些已知路径搜索没有匹配，则使用经过验证的精确错误文本或受影响方法名再次搜索。若存在匹配的 open issue，应补充证据，而不是创建重复 issue。

- [ ] **步骤 6：每个独立根因创建一个 issue**

  每个 issue 必须包含：基线 SHA、与 #2678/#2680 的关系、最小复现、预期/实际行为、影响、证据、排除范围和必需回归测试。仅当多个症状共享根因和修复边界时，才合并到同一 issue。

- [ ] **步骤 7：继续独立测试**

  创建 bug issue 不代表获得代码修复授权，也不得停止无关计划任务。

---

## 任务 10：清理与完成前验证

**文件：**
- 删除：`/tmp/objectstack-pr2680-qa-98874656/harness/**`
- 删除：`/tmp/objectstack-pr2680-qa-98874656/db/**`
- 报告完成后删除：fixture、日志、临时 profile 和非必要截图
- 保留：计划文件、执行报告、最终代表性截图、最终回复中的证据摘要和 GitHub issue 链接

**接口：**
- 输入：完成的测试矩阵和 issue 记录。
- 输出：干净 worktree、无孤儿进程、基于证据的最终报告。

- [ ] **步骤 1：只停止本计划记录的进程**

  按已记录 PID 终止 backend、Vite 和所有测试 watcher。验证：

  ```bash
  lsof -nP -iTCP:3000 -sTCP:LISTEN
  lsof -nP -iTCP:5180 -sTCP:LISTEN
  ```

  预期：不存在本任务遗留的监听进程。

- [ ] **步骤 2：删除临时 QA 文件和 profile**

  提取报告证据后，删除临时 harness、数据库、CSV、浏览器 profile、trace、scratch 输出和 detached 归因 worktree。保留日志和 issue 正文中不得包含 secret。

- [ ] **步骤 3：核验仓库清洁度**

  运行：

  ```bash
  git status --short
  git diff --stat
  git diff -- packages/core packages/metadata-protocol packages/objectql packages/plugins/driver-sql packages/rest packages/runtime
  ```

  预期：没有产品/测试代码差异；仓库中只允许出现用户要求且未提交的计划文件、执行报告和最终代表性截图。

- [ ] **步骤 4：重新运行最小最终验证**

  删除临时观测后，重新运行任务 2 中的 PR 专项基线测试。

  预期：最终测试输出来自干净源码，而不是带临时观测的源码。

- [ ] **步骤 5：审计已完成测试矩阵**

  为每个测试 ID 记录 `passed`、`failed-confirmed-bug`、`failed-environment`、`blocked` 或 `not-applicable`；不允许留空状态。

- [ ] **步骤 6：生成最终报告**

  报告内容：

  - 固定基线与环境；
  - #2678 各验收条件结论；
  - 所有已执行测试 ID 和数量；
  - 确认 bug 与 issue 链接；
  - 补充了新证据的既有 issue；
  - 不属于 bug 的覆盖缺口；
  - 未验证风险；
  - 仅云环境可验证的未测清单；
  - 性能/调用次数证据；
  - UI 截图；
  - 清理结果与 worktree 状态。

## 预期发现边界

本计划不得夸大 PR 的范围：

- Import lookup/reference 和重复检测读取仍按行执行；#2678 优化的是写入。
- Summary 去重作用于每次 engine array insert/batch，而不是整次 load。
- 自引用 seed dataset 为保证引用正确性，按设计保留顺序写入。
- 没有 `createManyData` 的 protocol 按设计保留逐行创建兼容性；其重试预期仍需测试确认。
- 重试不自动等于 exactly-once。除非既有契约保证幂等性，否则响应丢失导致重复属于探索性可靠性测试。
- 同文件前序行引用属于兼容性测试；只有 #2680 前行为或文档契约证明支持时，失败才能判定为回归。
- 本地耗时只能证明相对行为，不能证明 Turso 生产环境延迟。

## 计划编写自检（已完成）

- [x] #2678 的每条验收条件都映射到一个或多个测试 ID。
- [x] 必需验收测试与探索性兼容测试可以明确区分。
- [x] 命令指定了准确 package/文件，并包含预期证据。
- [x] 适用时，每个成功路径断言都同时检查真实数据库状态。
- [x] 故障注入明确指定失败边界和 attempt。
- [x] 当前 `main` 验证与 merge commit 归因相互分离。
- [x] 测试失败不会意外授权代码修复。
- [x] GitHub issue 要求稳定复现和重复搜索。
- [x] UI 测试遵守全新 profile、无头、内置浏览器和截图要求。
- [x] 仅云环境可验证的限制明确，且不阻塞本地执行。
- [x] 清理步骤能证明没有产品代码变更或孤儿服务。
- [x] 计划中没有未解决占位步骤或未明确的预期结果。

## 执行说明

用户批准后，在新的执行回合中先声明使用 `superpowers:executing-plans`，完整读取本文件，执行任务 0 的严格审查，创建/更新任务清单，然后连续执行任务 0–10。全程严格执行“上下文与输出预算”：完整输出落盘、对话只保留增量摘要、拒绝重复、每个顶层任务写持久化检查点。完成任务 0–9 中的每个顶层任务后，执行一次 5–10 秒随机间隔；不得把该间隔扩展到每个步骤或测试用例。通过的阶段之间不得再次请求确认。只有当关键歧义会改变预期产品行为，或 blocker 会使所有剩余证据失效时，才暂停。
