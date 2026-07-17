# Framework #2678 “问题一”Hook 补充 QA 报告

## 结论

固定历史目标 `98874656ffc50ce1531af52346228ffcdda73fba` 上，“批量写入与汇总计算”不能再表述为对 Hook 完整通过：

- 1,000 行 / batch size 200 的物理批量写入仍是 5 次，Seed、Import 和两组 summary 数据均完整落库；
- summary 重算仍为单父 5 次、十父 50 次，父记录 `beforeUpdate` / `afterUpdate` 次数、顺序、`previous` 和最终金额全部符合预期；
- 子记录 `beforeInsert` / `afterInsert` 却是**每批一次、参数为 200 行数组**，不是每条记录一次；因此记录级 Hook 的 flat input 读取、字段修改和逐行异常隔离失效；
- blocking `afterInsert` 在物理批写后抛错时，还观察到 loader 报告 0 成功 / 5 失败而 SQLite 已保留 5 行的持久化矛盾；该项保存在[候选问题备忘](results/product-issue-afterinsert.md)，等待维护者确认是否上报。曾未经确认创建的 Framework [#3153](https://github.com/objectstack-ai/framework/issues/3153) 已关闭，只作为历史操作记录，不是活动 Issue。

83 项分层比较中 45 项通过、38 项失败。失败是 harness 成功捕获产品行为与记录级 Hook 契约不一致，不是测试基础设施失败。记录级批量 Hook 输入形状缺口已由 [#2922](https://github.com/objectstack-ai/framework/issues/2922) / [#2941](https://github.com/objectstack-ai/framework/pull/2941) 在后续提交 `31d04d484eb80688d7963fbfda2140f6cc665bd0` 处理；本轮没有把后续提交作为受测版本，也不宣称已复验该修复。

## 固定版本与方法

| 项目 | 值 |
|---|---|
| 原始 Issue / 实现 PR | Framework #2678 / #2680 |
| 受测 Framework | `98874656ffc50ce1531af52346228ffcdda73fba` |
| #2680 合并归因 | `21420d9f82ebdcd53a6361ded3d829723bcab18e` |
| 记录级 Hook 后续修复参考 | `31d04d484eb80688d7963fbfda2140f6cc665bd0` |
| 数据 | 复用 `2026-07-11/reconstructed-fixtures` 的 5 份确定性 CSV，另增两份 5 行异常探针 |
| 运行时 | 真实 ObjectQL、SeedLoader、Import REST、SqlDriver、better-sqlite3 |
| 数据库 | 三个互相独立的 fresh SQLite 文件 |
| 参数 | batch size 200、insert、Seed `transaction=false`、Import `runAutomations=true` |

Harness 只包装公开执行点并将调用原样委托给产品实现；Hook 通过真实 `engine.bindHooks` 或 `registerHook` 注册。没有模拟写入成功，没有修改 Framework 产品代码。

## 生命周期口径

从 Hook 协议、目标实现、现有测试和后续 #2922/#2941 交叉确定的记录级批量契约为：

1. 同一批的每行按输入顺序各触发一次 `beforeInsert`，`ctx.input.data` 与 flat `ctx.input.*` 均表示单条记录；
2. 所有 `beforeInsert` 成功后，驱动对这一批调用一次 `bulkCreate(array)`；
3. 每个返回记录按结果顺序各触发一次 `afterInsert`，`ctx.result` 表示单条记录；
4. 子记录 Hook 完成后，按该批首次出现的唯一父项依次执行 `aggregate → beforeUpdate → driver.update → afterUpdate`；
5. Seed 的 Hook session 应保留 `isSystem=true`、`skipTriggers=true`。`skipTriggers` 是自动化上下文，本轮不把它解释为跳过数据 Hook。

目标提交的真实顺序仍是 `beforeInsert(array) → bulkCreate(array) → afterInsert(array)`，所以大阶段先后没有颠倒，但调用粒度和参数形状不符合记录级契约。

## 正常路径：四类证据分别判定

| 场景 | Hook | 写入与批次 | Summary | 最终 SQLite |
|---|---|---|---|---|
| Seed 1,000 | 预期 1,000/1,000 次 record；实际 5/5 次 array；字段修改 0/1,000 落库 | 5 次 engine array insert、5 次 bulkCreate、0 次 create；5 个 200 行边界全对 | 不适用 | 1,000 行、唯一键 1,000、金额和 `500500` |
| Import 1,000 | 预期 1,000/1,000；实际 5/5 次 array；字段修改 0/1,000 落库 | 5 次 protocol createMany、0 次 createOne；5 次 engine/bulk；HTTP 无错误 | 不适用 | 1,000 行、唯一键 1,000、金额和 `500500` |
| 单父 1,000 | 子 Hook 预期 1,000/1,000；实际 5/5 次 array；父 Hook 5/5 次通过 | 5 次 bulkCreate | 5 次 aggregate；累计 `20100, 80200, 180300, 320400, 500500`，`previous` 链正确 | 父总额 `500500`，子 1,000 行 |
| 十父 1,000 | 子 Hook 预期 1,000/1,000；实际 5/5 次 array；父 Hook 50/50 次通过 | 5 次 bulkCreate | 50 次 aggregate；每批父项顺序均为 `parent_01`～`parent_10` | 十父最终 `49600`～`50500`，合计 `500500` |

这证明 Hook 断言、物理写入计数、summary 重算和最终数据库值不能互相替代：写入、summary 与业务金额可全部正确，同时记录级 Hook 仍然失效。

## `beforeInsert` 异常探针

输入 5 行，第 3 行 `name=reject_me`。正确记录级行为应在第 3 行 Hook 抛错前停止本批物理写入，再由既有 helper 逐行隔离：预期 4 成功 / 1 失败、坏行不落库、好行 Hook 修改落库。

目标提交实际只用数组调用 Hook 一次，flat `ctx.input.name` 为 `undefined`，拒绝条件没有命中：

| 指标 | 预期 | 实际 |
|---|---:|---:|
| `beforeInsert` / `afterInsert` | 8 / 4 次 record | 1 / 1 次 array |
| engine insert | 6 | 1 |
| bulkCreate / create | 0 / 4 | 1 / 0 |
| loader 报告 | 4 inserted / 1 errored | 5 inserted / 0 errored |
| SQLite | 4 行，坏行不存在，4 个 marker | 5 行，坏行存在，0 个 marker |

## `afterInsert` 异常观察

另一个 fresh 数据库用 batch-aware Hook 在包含第 3 行时抛错，以避开 flat input 问题并观察 post-write failure：

- 初始 `bulkCreate` 已成功持久化 5 行；
- `afterInsert` 抛错使 `engine.insert(array)` reject；
- helper 逐行 fallback 5 次，全部因唯一键冲突失败；
- loader 报告 0 inserted / 5 errored；SQLite 实际存在 5 行，且完整性检查为 `ok`。

此场景只确认“返回报告与最终持久化状态相反”。本轮没有建立所有 blocking Hook 必须回滚的通用语义，也没有验证事务模式、其他驱动或当前 `main`，因此该项分类为观察性产品问题而不是跨环境结论。

该观察项当前状态为“候选、待维护者确认”。本报告不要求用当前 `main` 重跑，因为受测口径固定为历史提交 `98874656ffc50ce1531af52346228ffcdda73fba`；若未来决定正式上报，是否补充当前版本证据由维护者另行决定。

## 校验结果

- 目标提交完整 build：70/70 tasks；
- 相关现有测试：82/82 通过（Core bulk-write 11、ObjectQL Hook/summary 25、REST import bulk 5、Runtime seed loader 41）；
- 补充比较：83 项，45 passed / 38 failed；分类为 Hook 6/26、write 12/15、summary 5/5、database 10/17、order 2/6、exception 1/5、observation 9/9；
- 三个 SQLite 均 `PRAGMA integrity_check = ok`，仅包含各自的 `qa_*` 表，没有账号、会话或其他系统表，因此归档完整最小数据库而不是生产数据库；
- 首次 harness 启动因证据目录缺少 ESM package boundary 在产品初始化前退出，未生成数据库或 raw results；该失败日志保留，补齐与旧归档一致的 `source/package.json` 后从 fresh 状态成功重跑。

## 证据边界

- 结论只适用于固定历史 Framework、上述本地 SQLite 和明确参数；
- 没有运行 ObjectUI、浏览器、云端、Turso/libSQL、远程连接池或故障注入；
- 包装器调用次数不是性能测量，本补充不新增吞吐、延迟或性能倍数结论；
- 后续 #2941 只作为契约来源，不作为本轮通过证据；
- 完整 stdout/stderr 包含产品自身对未安装 `sys_organization` / `sys_metadata` 的探测错误，这些探测未创建或读取账号/会话数据，不影响 QA 表结果；
- 本任务未修改 Framework 产品代码。
