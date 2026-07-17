# Issue #2678 一键本地启动设计

## 目标

把普通使用者的命令缩减为两条：先进入已有 Framework 源码目录，再执行 UI QA 软件包中的一个脚本。使用者不再填写 `--framework-root`、模式或端口，也不需要分别执行校验、Console 构建和启动命令。

```bash
cd /path/to/framework
/path/to/ui-qa-app/run-local.sh
```

## 一键脚本

在 `ui-qa-app/` 根目录新增 `run-local.sh`。脚本把当前工作目录视为 Framework 根目录，并按固定顺序执行：

1. 检查当前目录是否为已安装依赖、已构建 CLI 的 Framework 源码检出。
2. 运行软件包校验器；校验失败立即停止。
3. 检查 `packages/console/dist/index.html`。
4. Console 缺失时，明确提示首次准备可能耗时并占用约 1.7 GB 缓存，然后自动执行 `pnpm objectui:build`。
5. 再次确认 Console 已生成。
6. 以当前目录作为 `--framework-root`，固定启动 `manual` 模式和端口 `38421`。

脚本最后使用 `exec` 进入现有 `start-ui.mjs`，因此 `Ctrl+C` 仍直接交给现有启动器，Framework 会按原逻辑删除 `--fresh` 临时数据库。

## 安全边界

- 不 clone Framework，不创建或切换 worktree、分支。
- 不自动安装依赖，也不修改 Framework 源码。
- 仅当 Console 缺失时生成 Framework 的 Console 构建和缓存；这是使用者已确认允许的行为。
- 每次仍使用全新临时数据库，不接触持久化环境。
- 原有 `start-ui.mjs`、`verify-package.mjs` 和 `seeded` 高级用法继续保留，便捷脚本不改变它们的接口。

## 文档结构

`README.md` 开头改为“普通使用者只看这里”，仅保留两条启动命令、登录信息、UI 导入路径、CSV 文件和预期的 1,000 条结果。模式说明、证据边界和维护者命令移到后面。

`ui-verification.md` 开头增加提示：该文件是审计证据，普通使用者无需阅读，实际操作以 README 为准。

## 错误处理

- 从错误目录运行：用中文指出必须先 `cd` 到 Framework 根目录。
- Framework 未安装依赖或 CLI 未构建：停止并给出准备命令，不偷偷安装。
- 软件包校验失败、Console 构建失败或启动失败：保留原命令退出码并停止后续步骤。
- 端口 `38421` 被占用：沿用现有启动器/CLI 的明确错误，不自动停止其他进程。

## 验证

- 使用临时伪 Framework 目录和命令记录器验证调用顺序。
- Console 已存在时不得调用 `pnpm objectui:build`。
- Console 缺失时必须调用一次构建，并在构建产物仍缺失时失败。
- 非 Framework 目录必须在执行任何构建或启动前失败。
- 执行 shell 语法检查、现有 Node 测试、软件包校验、归档 SHA-256 和 Markdown 链接检查。
