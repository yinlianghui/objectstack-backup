# 审计组 B 结果

## 环境与证据

- 审计时间：2026-07-11（Asia/Shanghai）；独立运行点击时间 `2026-07-11T07:53:04.914Z`。
- 固定 baseline：Framework `98874656ffc50ce1531af52346228ffcdda73fba`；ObjectUI `80901aad44ff3beeaf7882ec3367da934325b2f2`。
- 独立环境：全新 `--fresh` Showcase 后端、本地 SQLite、全新 seed admin 会话；未使用旧数据库、旧进程或隐藏 Chat 状态。
- 是否启动服务：是。后端 `:3000`（session/PID 归属本任务）与 ObjectUI Vite `:5180`（session/PID 归属本任务）；均已停止，端口已释放，fresh 后端目录已删除。

| Issue | Identity | Baseline | Preconditions | Fixture | Steps | Expected | Actual | Stability | Evidence | Boundary | 最终状态 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| [framework #2824](https://github.com/objectstack-ai/framework/issues/2824) | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | ready-stable |
| [objectui #2393](https://github.com/objectstack-ai/objectui/issues/2393) | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | ready-stable |

## 独立复现

### 输入规则

- 新生成 CSV 共 50,001 行（表头 + 50,000 条记录），列为 `name,status,industry,annual_revenue`。
- 名称规则：`QA-AUDIT-CANCEL-20260711-R1-` + 五位递增序号 `00001`～`50000`；名称 50,000/50,000 唯一。
- 固定有效值：`status=active`、`industry=finance`、`annual_revenue=900001`～`950000`。
- 导入模式为始终新建；预览确认自动映射 4 列、共 50,000 行、大文件后台导入。

### 操作步骤

1. 在固定 Framework baseline 上启动全新 `--fresh` Showcase 后端 `:3000`，在固定 ObjectUI pin 上启动 Vite `:5180`。
2. 使用 fresh 后端创建的 `admin@objectos.ai` 登录，进入 Showcase 的 Accounts/客户列表并打开导入向导。
3. 将新生成 CSV 粘贴到向导，确认 `name/status/industry/annual_revenue` 分别映射到客户名称/生命周期/行业/年收入。
4. 点击“导入 50000 行”，等待唯一的 `data-testid=import-cancel-async` 控件可见。
5. 自动化确认作业仍在 running，界面显示 `正在导入第 0/50000 行… 0%`，于 `2026-07-11T07:53:04.914Z` 点击“取消导入”。
6. 不以即时向导文案作为终态；等待作业完成，再核对向导、导入历史、SQLite `sys_import_job` 与 `showcase_account`。

### 判定与结果

- 严格预期：作业终态为 `cancelled`，且业务表中本轮前缀记录数小于 50,000；前端只有在服务端确认该终态后才可显示取消成功。
- 向导实际：约 10 秒后显示“导入已取消 / 已导入 0 条”。
- 导入历史实际：`成功 / 50000/50000 / 新建 50000 条`。
- `sys_import_job` 实际：job `imp_mrg2husz2cp76asw`，`status=succeeded`、`total_rows=50000`、`processed_rows=50000`、`created_count=50000`、`updated_count=0`、`skipped_count=0`、`error_count=0`；`started_at=2026-07-11T07:53:04.312Z`，`completed_at=2026-07-11T07:53:12.766Z`。
- 业务表实际：本轮前缀匹配 50,000 条，`count(distinct name)=50000`，首尾名称为 `...-00001` / `...-50000`；全表由初始 13 条增至 50,013 条。
- 独立审计：1/1 复现；与 Issue 既有独立前缀 2/2 结果一致，累计证据 3/3。首次已稳定复现，未执行第二轮。

## 问题边界

- framework #2824 仅跟踪服务端 running job 未停止并最终完整成功；objectui #2393 仅跟踪服务端未确认 `cancelled` 时向导仍构造“已取消 / 0 条”。同一次运行同时验证两个 Issue，但修复边界分属两个仓库。
- #2824 正文中的 SQLite 事件循环阻塞只是待 instrumentation 验证的候选解释，不是已确认根因；本次未增加日志或修改代码验证该归因。
- 不宣称 #2680 引入此问题；云端、Turso/libSQL 与外部环境未测，均为 `cloud-not-tested`。
- 两个 Issue 的正文和评论已包含固定版本、fresh SQLite 前置条件、唯一有效 50,000 行输入规则、取消时机、严格终态判定、2/2 结果和两仓库边界；理解与复现不依赖 `objectstack-backup`。备份链接仅为附加截图归档。

## 补充动作

- 追加评论：[framework #2824 边界说明](https://github.com/objectstack-ai/framework/issues/2824#issuecomment-4943683951)、[objectui #2393 边界与前置条件说明](https://github.com/objectstack-ai/objectui/issues/2393#issuecomment-4943684073)。独立 1/1 与既有结论一致，未再追加重复评论。
- 最小复现：已按更正要求执行一次共享的 50,000 行独立运行；首次即复现，未执行第二轮。
- 产品代码：未修改。
- 临时产物：CSV、截图及 fresh SQLite 均已删除；关键运行中、向导误报、历史终态截图已在 Chat 展示后清理。

## 未解决缺口

- 精确服务端事件循环归因仍需修复阶段的 instrumentation；不影响两个用户可见问题的稳定复现结论。
- 云环境未测（`cloud-not-tested`）。
