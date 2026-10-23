# 贡献指南

感谢你愿意为 dsh-draft-optimizer 贡献力量！

## 环境准备

1. 安装 DSH 桌面端（本项目面向 `0.2.x` 系列）。
2. 克隆本仓库到任意目录，例如 `D:\dev\dsh-draft-optimizer`。
3. 在插件目录执行 `pnpm install`（使本地能解析 `zod`）。
4. 通过插件管理器以本地目录方式安装，或 `dsh plugin --profile desktop add dsh-draft-optimizer@link:<绝对路径>`。
5. 完整重启 DSH 后验证 ✦ 按钮出现且可点击。

## 提交流程

1. Fork 本仓库，创建特性分支：`git checkout -b feat/my-change`。
2. 修改代码，保持风格一致（本项目使用无分号、单引号的 JS 风格）。
3. 可运行的测试：`node tests/manifest.test.mjs`（清单形状校验 + 纯函数测试），以及 `node --check lib/*.js`。
4. 功能验证：重启 DSH → 输入草稿 → 点 ✦ → 确认草稿被替换且未自动发送。
5. 提交 PR，描述改动内容、验证步骤；UI 改动请附截图。

## 对本插件的两条硬性约束

- **严禁在 `apply()` 中手动 `ctx.typert.register()`**：typert-loader 会在 entry 挂载时自动注册 `./typert` 清单；手动重复注册会导致启动期 fiber reload，拖垮整个 host 启动（桌面端会弹「Disable third-party plugins」恢复对话框）。
- **宿主 `apply()` 内的所有注册动作必须防御式执行**（try/catch 兜底，失败只降级为插件不可用），任何同步抛错都会拖垮 host 启动。

## 其他约定

- 新增面向模型的消息内容时，保持“草稿只是素材、绝对禁止回答/执行”的指令语义。
- 文案保持中英双语（`locale/` 与客户端内置 STRINGS）。
- 许可证 MIT：贡献即视为同意以 MIT 条款贡献。