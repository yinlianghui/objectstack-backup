# 审计组 C 结果

## 环境与证据

- 审计时间：2026-07-11 17:34–17:41 CST
- 固定 baseline：Framework `98874656ffc50ce1531af52346228ffcdda73fba`；ObjectUI `80901aad44ff3beeaf7882ec3367da934325b2f2`
- 审计范围：Task 0、Task 3；仅依据 framework #2801/#2805/#2807/#2823 正文和评论构造本轮输入
- 是否启动服务：是。#2801 使用专属端口 `42801`；#2823 使用本任务 fresh backend `3000` 与固定 ObjectUI Vite `5180`。仅停止本任务 PTY session `34087`、`2545`、`52831`；最终三个端口均无监听。PTY 未暴露子进程 PID，故以 session、端口、退出码和最终监听状态记录。
- 产品仓库：未修改 framework/objectui 产品或测试代码；未提交、未推送。
- 临时证据：harness、CSV、SQLite、health body、Issue JSON、评论 body 与截图均只放在 `/tmp/objectstack-issue-repro-audit-peripheral-31892`；关键 #2823 终态截图已在聊天展示，收尾删除该目录。#2823 的既有耐久截图仍由 Issue 评论公开保存。

| Issue | Identity | Baseline | Preconditions | Fixture | Steps | Expected | Actual | Stability | Evidence | Boundary | 最终状态 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| framework #2801 `docs(dev): documented root --fresh/-p invocation fails argument forwarding` | yes | yes | yes | not-applicable | yes | yes | yes | yes | yes | yes | ready-stable |
| framework #2805 `fix(seed): deferred reference update failures are swallowed as success` | yes | yes | yes | yes（本轮评论补齐） | yes（本轮评论补齐） | yes | yes | yes | yes | yes | ready-stable |
| framework #2807 `design(import): reject duplicate effective CSV headers instead of last-wins` | yes | yes | yes | yes（第二类输入由本轮评论补齐） | yes | yes | yes | yes | yes | yes | ready-stable |
| framework #2823 `fix(showcase): Capability Map internal links resolve under the page route` | yes | yes | yes | not-applicable | yes | yes（本轮评论更正 app id） | yes | yes | yes | yes | ready-stable |

## 独立复现记录

### framework #2801

- 与 #2678 的边界：文档命令与根/示例两层 `pnpm` script 的参数转发组合问题；Issue 已通过历史边界说明它在 #2680 前存在，不属于 bulk-write 核心回归。
- 输入：仓库根目录、空闲任务专属端口 `42801`。
- 错误命令（本轮 1 次）：

  ```bash
  cd /Users/yinlianghui/Documents/GitHub/framework-pr2680-qa-v2
  pnpm dev -- --fresh -p 42801
  ```

- 预期：fresh 后端绑定 `42801`。
- 实际：展开为 `objectstack dev --seed-admin -- --fresh -p 42801`，报 `Unexpected arguments: -p, 42801`，未绑定端口；exit `2`。
- 正确替代命令（本轮 1 次）：

  ```bash
  cd /Users/yinlianghui/Documents/GitHub/framework-pr2680-qa-v2
  pnpm dev --fresh -p 42801
  curl -sS -o /tmp/objectstack-2801-health.json -w 'HTTP %{http_code}\n' \
    http://127.0.0.1:42801/api/v1/health
  ```

- 实际：日志显示 `Fresh OS_HOME`、`Server is ready`、API `http://localhost:42801/`；health 为 HTTP `200`，curl exit `0`。随后只向本任务 session 发送 SIGINT，dev 命令 exit `130`，端口释放。
- 稳定性：Issue 既有 2/2；本轮错误命令 1/1 同样失败，累计 3/3；正确替代命令本轮 1/1 启动成功。

### framework #2805

- 与 #2678 的边界：`resolveDeferredUpdates` 的 pass-2 catch 在 #2680 前已存在；它影响 seed 验收可信度，但不是 #2680 新增 bulk helper 的回归。
- 输入：全新 better-sqlite3 文件库；`audit_department(name, head_id -> audit_worker)` 与 `audit_worker(name, department_id -> audit_department)`；seed 分别为 `{name:"Engineering", head_id:"Alice"}` 与 `{name:"Alice", department_id:"Engineering"}`；`multiPass:true`、`mode:"insert"`。在 pass-2 第一次 `engine.update` 精确注入 `Error("fetch failed")`。
- 完整命令：

  ```bash
  cd /Users/yinlianghui/Documents/GitHub/framework-pr2680-qa-v2
  rm -f /tmp/objectstack-issue-repro-audit-peripheral-31892/2805-fresh.sqlite
  pnpm exec tsx \
    /tmp/objectstack-issue-repro-audit-peripheral-31892/repro-2805.ts \
    /tmp/objectstack-issue-repro-audit-peripheral-31892/2805-fresh.sqlite
  ```

- 预期：瞬时 update 被重试；若仍失败，应进入返回 errors、`success:false`，并保留未解析引用的准确计数。
- 实际：产品逻辑内 `updateAttempts=1`；只发出 `Failed to resolve deferred reference` warning；返回 `success:true`、`errors:[]`、`totalErrored:0`、`totalReferencesDeferred:1`；数据库中 `audit_department.head_id=null`，worker 的反向引用已解析；exit `0`。
- 诊断重复：首次命令在进入产品逻辑前因 `/tmp` TS 被按 CJS 转换、top-level await 不受支持而 exit `1`。只将 harness 包入 `main()`，删除 fresh DB 后诊断重复 1 次即得到上述产品结果；没有第二次产品复现。
- 稳定性：Issue 既有 fresh DB 2/2；本轮有效产品运行 1/1 一致，累计 3/3。评论补齐链接：<https://github.com/objectstack-ai/framework/issues/2805#issuecomment-4944464591>。

### framework #2807

- 与 #2678 的边界：CSV parser 来自 #2771，晚于 #2680；没有公共 duplicate-header contract，故是 parser/design validation gap，不冒充 #2678/#2680 回归。
- 公共前置：具有 `id`、`title` 字段的全新 `audit_csv_task`；每种输入使用独立 fresh SQLite；真实 `POST /api/v1/data/:object/import` route。
- 输入 A（重复 raw header，本轮 1 次）：

  ```csv
  ID,标题,标题
  dup,first,second
  ```

  mapping：`{"ID":"id","标题":"title"}`。
- 输入 B（不同源列映射同一目标，本轮 1 次）：

  ```csv
  ID,标题A,标题B
  dup,first,second
  ```

  mapping：`{"ID":"id","标题A":"title","标题B":"title"}`。
- 完整命令：

  ```bash
  cd /Users/yinlianghui/Documents/GitHub/framework-pr2680-qa-v2
  rm -f \
    /tmp/objectstack-issue-repro-audit-peripheral-31892/2807-raw.sqlite \
    /tmp/objectstack-issue-repro-audit-peripheral-31892/2807-mapped.sqlite
  pnpm exec tsx \
    /tmp/objectstack-issue-repro-audit-peripheral-31892/repro-2807.ts \
    /tmp/objectstack-issue-repro-audit-peripheral-31892/2807-raw.sqlite \
    /tmp/objectstack-issue-repro-audit-peripheral-31892/duplicate-raw-header.csv \
    /tmp/objectstack-issue-repro-audit-peripheral-31892/2807-mapped.sqlite \
    /tmp/objectstack-issue-repro-audit-peripheral-31892/distinct-headers-same-target.csv
  ```

- 预期：两种歧义均在写前拒绝，并指出冲突列/字段。
- 实际：两种输入均 HTTP `200`，`total=1, ok=1, errors=0, created=1`；两张 fresh DB 都持久化 `id=dup, title=second`；进程 exit `0`。
- 稳定性：Issue 既有两类输入 2/2；本轮每类各 1/1 一致，累计每类 3/3。评论补齐链接：<https://github.com/objectstack-ai/framework/issues/2807#issuecomment-4944464939>。

### framework #2823

- 与 #2678 的边界：Showcase Capability Map 元数据链接问题，与 CSV/import/runtime 写入链路完全独立，仅在 #2678 UI follow-up 中附带发现。
- 环境启动：

  ```bash
  cd /Users/yinlianghui/Documents/GitHub/framework-pr2680-qa-v2
  pnpm dev --fresh -p 3000

  cd /Users/yinlianghui/Documents/GitHub/objectui
  DEV_PROXY_TARGET=http://localhost:3000 pnpm --filter @object-ui/console dev
  ```

- 前置终态：backend 日志明确 `Fresh OS_HOME: .../objectstack-dev-HQW70F`、`Server is ready`；ObjectUI Vite `http://localhost:5180/`；使用内置浏览器新 tab，从未登录状态以 fresh seed admin 登录。
- 完整 UI 操作（本轮只点击目标一次）：打开 `/home` → 点击唯一 `Showcase` 按钮 → 起始 URL `http://localhost:5180/apps/com.example.showcase/page/showcase_capability_map` → 确认唯一 `Projects (backbone)` link（点击前 href `apps/com.example.showcase/showcase_project`）→ 点击 1 次 → 等待 UI 终态。
- 预期：从应用根解析到 `/apps/com.example.showcase/showcase_project`。Issue 正文原写 `/apps/com.objectstack.showcase/showcase_project`，与固定 baseline 的 app id 不一致，已在评论更正。
- 实际：URL 变为 `http://localhost:5180/apps/com.example.showcase/page/apps/com.example.showcase/showcase_project`；页面唯一 `Page not found` 文本可见（count `1`），并显示 `The URL you followed does not match any view in this app.`。浏览器操作本身无进程退出码，以该 URL + UI 终态为判定；截图已在聊天展示。
- 稳定性：Issue 既有 UI 2/2；本轮 fresh 栈 1/1 一致，累计 3/3。评论补齐链接：<https://github.com/objectstack-ai/framework/issues/2823#issuecomment-4944467300>。
- 启动诊断边界：在正式 UI 运行前曾尝试 `pnpm exec objectstack dev --seed-admin --fresh -p 3000`；根 CLI 转入 `pnpm dev` 后未保留 fresh 参数，日志显示持久路径，因此立即停止且未打开 UI，不计 #2823 复现。随后以上述 `pnpm dev --fresh -p 3000` 建立正式 fresh 栈。

## 补充动作

- 追加评论：#2805 <https://github.com/objectstack-ai/framework/issues/2805#issuecomment-4944464591>；#2807 <https://github.com/objectstack-ai/framework/issues/2807#issuecomment-4944464939>；#2823 <https://github.com/objectstack-ai/framework/issues/2823#issuecomment-4944467300>。
- 未追加评论：#2801（正文已有完整错误命令、正确替代命令、exit code、2/2 与边界，本轮结果无差异）。
- 最小复现：按维护者本轮“独立重现审计”覆盖要求，四个 Issue 均执行 1 次有效产品复现；#2807 的两类输入各 1 次。#2805 另有 1 次进入产品逻辑前的 harness 诊断失败和最多 1 次诊断重复。

## 未解决缺口

- 无。四个 Issue 本地行为均达到 `ready-stable`；本组不涉及云环境，`cloud-not-tested` 为 not-applicable。
