# ✦ Draft Optimizer（DSH 插件）

[![Release](https://img.shields.io/github/v/release/xiong356/dsh-draft-optimizer)](https://github.com/xiong356/dsh-draft-optimizer/releases) [![CI](https://img.shields.io/github/actions/workflow/status/xiong356/dsh-draft-optimizer/ci.yml?branch=main&label=CI)](https://github.com/xiong356/dsh-draft-optimizer/actions/workflows/ci.yml) [![License: MIT](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

> 非官方插件，与 DeepSeek 无附属关系。
> 在 DSH（DeepSeek Harness）输入框下方加一个 ✦ 小按钮：一键用**当前默认模型**优化草稿，并**原地替换**——绝不自动发送。

## ✨ 功能

- 输入框下方 ✦ 小按钮，一键优化当前草稿
- 只替换、不发送：优化完成后由你检查并手动发送
- 保持原意、话题方向与语言不变（中文草稿输出中文，英文草稿输出英文）
- 忙碌 spinner、空草稿禁用、成功 ✓、失败保留原稿并提示、草稿冲突不覆盖
- 优化指令直接嵌入消息本体，不依赖 `system` 字段是否被转发
- 中英文案自适应（`navigator.language`）、浅色/深色主题自适应（`--dsw-alias-*` token）

## 📦 安装

在桌面端完成安装后**重启 DSH** 即可生效（宿主代码在启动时加载）。

从源码目录安装（开发模式，junction 链接，改源码立即生效，仅需重启宿主）：

```
dsh plugin --profile desktop add dsh-draft-optimizer@link:D:/path/to/dsh-draft-optimizer
```

或通过支持本地 bundle 安装的插件管理器界面，选择本仓库根目录安装。

> 源码树内需要一个可解析的 `zod`（Node 按 JS 文件的真实路径解析依赖）：
> 本地开发请在插件目录执行 `pnpm install`，或在 profile 依赖中声明 zod（与 `dsh-cost-meter` 相同的模式）。

## 🖱️ 使用

1. 在输入框输入内容（不要发送）；
2. 点击输入框下方的 ✦ 按钮；
3. 草稿被原地替换为优化后的提示词，检查后手动发送。

无配置项。优化调用消耗你当前配置的默认模型额度。

## 🔧 工作机制

- **客户端**（`lib/client.js`）：注册 `conversation.composer.dock` 插槽条目（id `draft-optimizer`，order 90），点击时读取草稿 → 经 Typert RPC 调用宿主 → 成功后 `inputActions.setDraft()` 原地替换。
- **宿主**（`lib/index.js`）：`draftOptimizer` 服务，读取 `agentDefaultModel.currentSelection()`，经 `llm.stream()` 流式生成；Typert 清单在 `lib/typert.host.js`。
- 优化请求仅含一条 system + 一条 user（指令 + 三引号包裹的草稿），**不携带会话历史**。
- **低思考档自适应**：首次调用时用 `llm.resolveCallConfig` 探测模型是否支持 `off` / `minimal` 推理档（不做 provider I/O），支持则采用并缓存，把首字延迟从 2.8–55s 压到 1.4–5s；不支持则按默认行为调用。
- **引用保护**：草稿里的 `@"path"` 引用会被原样保留，若模型仍丢了 `@`，`repairRefs` 按草稿兜底还原。

## 🔒 隐私与限制

- 草稿文本会发送至**你自己配置的 LLM 提供商**（这是功能本质）。
- **不参考**对话历史 / 附件 / 变量占位符；指代不明（如“按刚才的方案”）需先在草稿中补全。
- 无遥测、无任何网络回传，仅本地 RPC。
- 当前版本刻意不整合上下文，避免模型把历史当成任务背景去“回答”而非“优化”。

## 🧑‍💻 开发

- `node --check lib/*.js` 语法检查
- `npm test` / `node tests/manifest.test.mjs` 运行清单与纯函数测试
- 修改宿主侧逻辑后必须**重启 DSH** 才生效；客户端逻辑修改在支持 HMR 的页面刷新后生效

## 🤝 贡献

欢迎提交 Issue 与 PR，请阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 🔐 安全

安全与隐私说明见 [SECURITY.md](./SECURITY.md)。

## 📄 许可

[MIT](./LICENSE)