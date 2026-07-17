# Framework #2678 Hook 补充 QA 设计

## 目标与版本

本补充只验证“问题一：批量写入与汇总计算”与数据生命周期 Hook 的交互。主受测版本固定为 Framework `98874656ffc50ce1531af52346228ffcdda73fba`，与 2026-07-11 最终 QA 报告一致；PR #2680 的合并归因提交为 `21420d9f82ebdcd53a6361ded3d829723bcab18e`。后续修复 #2922 / PR #2941 只用于确定记录级 Hook 契约，不作为本轮受测版本。

## 契约依据

- `HookEvent` 没有 bulk-insert 事件；`beforeInsert` / `afterInsert` 是记录生命周期事件。
- `HookContext.input` 是 record-shaped mutable input；declarative binder 的 flat-input 代理以单记录字段读写为公开用法。
- PR #2941 明确裁决：数组 insert 仍应逐行触发 Hook；每行 `input.data` 和 `result` 都必须是单记录，同时驱动层继续一次 `bulkCreate`。
- 目标提交实际一次数组 insert 只触发一个数组上下文；本补充以记录级契约作为 expected，以目标提交的真实行为作为 actual。

## 测试单元

### H-NORMAL：正常批量生命周期

复用重建 CSV，分别运行 1,000 行 Seed、1,000 行 Import、单父和十父 summary。declarative `beforeInsert` 写入 `hook_marker`，`afterInsert` 记录返回值；父对象的 `beforeUpdate` / `afterUpdate` 记录 summary 更新。

预期每个 200 行批次的顺序是：200 个记录级 `beforeInsert` → 1 次真实 `bulkCreate` → 200 个记录级 `afterInsert` → 按首次出现顺序对每个受影响父项执行 `aggregate → beforeUpdate → driver.update → afterUpdate`。写入批次数仍为 5；父项更新仍为单父 5、十父 50。

### H-BEFORE-ERROR：记录级拒绝

新增 5 行输入，第 3 行 `name=reject_me`。普通 declarative `beforeInsert` 按单记录字段判断并抛出 `QA_HOOK_REJECT`。

记录级契约下，首个批次在第 3 个 before Hook 终止，bulk helper 再逐行降级：before Hook 共 8 次，after Hook 4 次，驱动 bulkCreate 0 次、create 4 次，最终 4 行成功、1 行失败，坏行不落库。

### H-AFTER-ERROR：写后异常观察

使用另一个 fresh SQLite 和 5 行输入；programmatic Hook 显式兼容数组/单记录并在 afterInsert 发现第 3 行时抛错。此场景只观察目标实现的异常传播、降级、报告与持久化是否一致，不把未定义的跨批事务语义写成通过标准。

## 证据分离

Hook 次数/顺序/参数、Engine/Driver 写入次数、summary 重算次数和最终 SQLite 值分别生成断言与比较项，任何一类都不能替代另一类。raw trace 保存每次事件的全序号、阶段、对象、事件、数据形状、行数、首尾键、session、result/previous 摘要和异常。

## 证据边界

本轮使用本地真实 SQLite、固定 Framework 源码和进程内 Hook；不覆盖 Turso/libSQL、云端延迟、远程重试、UI、HotCRM、绝对性能或当前 main。数据库只含本任务定义的 `qa_*` 表，无账号、会话或系统业务数据，可完整归档。

## 产物布局

本目录保存测试计划、harness、输入、expected、raw/comparison、SQLite、stdout/stderr、命令台账、环境、README、报告补充、manifest 与 SHA-256。既有 `reconstructed-fixtures` 不改写，复制的 CSV 在 manifest 中记录来源和哈希。
