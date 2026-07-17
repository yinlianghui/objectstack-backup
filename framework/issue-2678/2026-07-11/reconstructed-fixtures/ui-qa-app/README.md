# Issue #2678 问题一——可复制 UI QA 软件包

这套软件包用于手工导入并检查 Issue #2678“问题一”的 1,000 条重建数据。

## 普通使用者只看这里

在终端先进入已有 Framework 源码目录，再运行本软件包的一键脚本：

```bash
cd /path/to/framework
/path/to/ui-qa-app/run-local.sh
```

脚本会自动检查软件包。第一次运行如果缺少 Console，会自动构建；随后启动全新的临时测试数据库。看到网址后使用 `admin@objectos.ai` / `admin123` 登录。

接下来只做 4 步：

1. 打开 **Issue 2678 QA → QA Data → Import Items → Import**。
2. 选择本软件包中的 `fixtures/csv/qa_import_item.csv`。
3. 保持 `external_key`、`name`、`amount`、`active` 四个同名字段映射并提交。
4. 确认新建 1,000 条、失败 0 条。

测试完成后回到终端按 `Ctrl+C`，本次临时数据库会自动删除。

> `/path/to/...` 只是通用写法。实际操作时应替换为当前电脑上的真实目录；如果由 Codex 协助执行，Codex 应直接提供两条完整命令。

## 进阶说明

本目录可以复制到任意位置，再指向一个**已经安装依赖并完成构建的现有 Framework 源码检出**。启动器不会 clone Framework、创建 Framework worktree、切换分支或修改 Framework 源码。

### 前置条件

- Node.js 22 和 pnpm 10。
- 已有 `objectstack-ai/framework` 源码检出，并已安装依赖、构建 CLI。
- Framework 中存在 `packages/console/dist/index.html`。如果不存在，请先在 Framework 目录执行一次 `pnpm objectui:build`。

本软件包自身不需要安装依赖，所有运行均使用指定 Framework 源码中的 CLI 和依赖。

### 校验软件包

在本目录执行：

```bash
node scripts/verify-package.mjs --framework-root /path/to/framework
```

校验器会检查两个编译产物、4 个 QA 对象、种子数据边界、3 份逐字节保留的 CSV、3 份单工作表 XLSX、预期记录数与金额、产物哈希，以及不应出现的临时文件。如果本目录仍位于完整的重建归档中，还会对照归档中的标准对象源码检查生成的对象定义。

### 选择运行模式

每次启动都会通过 `--fresh` 创建独立的临时数据库。使用 `Ctrl+C` 停止进程后，Framework 会删除本次运行的临时数据库和上传目录。

`manual` 模式包含 4 个对象定义、应用 UI 外壳，以及固定的 11 条汇总父记录，适合通过 UI 手工导入：

```bash
node scripts/start-ui.mjs \
  --framework-root /path/to/framework \
  --mode manual \
  --port 38421
```

`seeded` 模式会初始化全部重建数据，便于立即查看：1,000 条种子数据、1,000 条导入数据、2,000 条汇总子记录和 11 条父记录。

```bash
node scripts/start-ui.mjs \
  --framework-root /path/to/framework \
  --mode seeded \
  --port 38422
```

打开启动器输出的网址，使用 `admin@objectos.ai` / `admin123` 登录。不要让两个模式同时使用同一端口。

### 通过 UI 手工导入

打开 **Issue 2678 QA → QA Data**，使用相应对象的 Import 操作，并保持下表所示的同名字段直接映射。

| 对象入口 | 导入文件 | 直接映射字段 |
|---|---|---|
| Import Items | `fixtures/xlsx/qa_import_item.xlsx` | `external_key`、`name`、`amount`、`active` |
| Summary Children | `fixtures/xlsx/qa_summary_child_single_parent.xlsx` | `external_key`、`name`、`parent_id`、`amount` |
| Summary Children | `fixtures/xlsx/qa_summary_child_ten_parents.xlsx` | `external_key`、`name`、`parent_id`、`amount` |

如果需要同时检查两种汇总分布，请在同一个全新 `manual` 环境中依次导入两份 Summary Children 文件。所需父记录已经存在，无需手工创建或填写内部记录 ID。`fixtures/xlsx/` 下的每个文件都特意只包含一个工作表和 1,000 行数据；`fixtures/csv/` 下提供了内容等价、逐字节保留的 CSV。

UI 支持 `.xlsx`，本软件包不包含旧格式 `.xls`。外层归档中的多工作表 Excel 是便于人工查看的审计材料，不是 UI 导入文件。

### 预期结果

- 每个导入文件包含 1,000 行，且 `external_key` 均不重复。
- 每个文件的 `amount` 合计均为 `500500`。
- Import Items 中 `active=true` 和 `active=false` 各 500 条。
- 单父场景的全部子记录都指向 `parent_single`；预期子记录数为 1,000，金额合计为 `500500`。
- 10 父场景按轮询方式分配；每个父记录对应 100 条子记录，`parent_01` 至 `parent_10` 的金额合计依次为 `49600`、`49700`、……、`50500`。
- 包含后端批次数和汇总重算次数在内的完整预期值见 `expected-results.json`。

### 证据边界

UI 导入成功可以证明当前 UI 能接收这些重建数据，并能查看写入后的记录值；它本身**不能**证明内部批量调用次数、汇总重算调用次数或性能。这些结论仍由外层 `reconstructed-fixtures` 归档中的后端 harness 和比较报告提供证据。

生成的对象源码应用了两项当前协议要求的显式规范化：历史定义中的 `tenancy: { enabled: false }` 会编译为 `tenancy: { enabled: false, strategy: "shared" }`；当前 OWD 也明确声明，3 个独立/共享 QA 对象使用 `public_read_write`，主从关系的子对象使用 `controlled_by_parent`。除此之外，4 个历史标准对象定义及其业务字段均未改变。

### 重新构建产物（仅维护者使用）

本软件包已经包含编译产物和导入文件。只有当本目录仍位于完整的 `reconstructed-fixtures` 归档中，并且确实需要基于准备好的 Framework 源码刷新产物时，才执行：

```bash
node scripts/build-artifacts.mjs --framework-root /path/to/framework
```

重新构建只会写入本软件包内部的生成文件。正常运行 `start-ui.mjs` 不会写入本目录或 Framework 源码；Framework 只管理本次 `--fresh` 运行对应的临时目录。
