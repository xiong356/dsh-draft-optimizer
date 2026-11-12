# Changelog

本项目的所有重要变更都会记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [1.2.0] - 2026-11-08

### Changed

- **优化结果默认附带「执行前澄清」条款**：输出末尾固定追加一段（由代码统一追加，不依赖模型自由发挥），
  要求执行方在开始前先检查需求是否清楚、缺信息或有歧义；如有，先提出必要问题，重点确认
  任务目标、使用场景、输出形式、判断标准与限制条件（能给出选项时直接给选项），确认清楚后再执行。
  中英文随草稿自动选择，输出已含澄清要求时不重复追加。
- **不再新增身份/角色设定**：优化结果不再出现「你是一位资深××专家」这类角色设定；草稿自带的身份保留。
- **默认不再留 `<尖括号占位符>`**：能推断的信息用可直接执行的通用表述补全，不能推断且不影响执行的
  直接省略；只有「改什么/对什么做」都无法推断时最多保留 1 个占位符。few-shot 示例改为
  「指代不明」与「完整草稿」两条对照，后者输出零占位符。

### Added

- 发布到 npm：`dsh-draft-optimizer@1.1.1` 已可从 [npm](https://www.npmjs.com/package/dsh-draft-optimizer)
  安装（预构建安装，无需 `allowBuilds` 构建授权），插件管理器与市场目录可直接按包名安装/更新；
  README 补充 npm 安装方式与徽章。
- **三个可选项**（profile 的 `cordis.patch.yml` 中插件条目 `config`，改完重启 DSH）：
  `clarify`（默认 `true`，是否附加执行前澄清条款）、`placeholders`（`minimal` 默认 / `never`，
  后者完全禁止占位符）、`identity`（默认 `false`，是否允许为执行方补充身份/角色）。

## [1.1.1] - 2026-11-04

### Fixed

- **新建对话窗口看不到 ✦ 按钮**：`ui-conversation` 在空白 Session 的 hero 屏里以
  `variant="hero"` 渲染 composer，而 `conversation.composer.dock` 只在
  `variant === "composer"`（active 对话）时渲染，因此按钮要等发出第一条消息后才出现。
  现在同一个按钮额外注册到 `conversation.hero.options`（官方文档的“New Session 行
  右对齐紧凑选项”，仅 hero 且存在 Session 时渲染）。两个插槽按相位互斥，
  任一时刻按钮只出现一次；两者都是 session 作用域，`useInput` / `inputActions` /
  `sessionId` 标准 props 完全一致，点击行为不变。

## [1.1.0] - 2026-10-27

### Changed

- **提示词重写**：从「一段任务说明」升级为「身份 + 5 条铁律 + 改写方法 + 两种错误示范 + few-shot 示例」。实测修复了三个真实缺陷：
  - 会把草稿里的 `@"src/app.ts"` 改写成 `src/app.ts`，破坏 composer 的引用识别；
  - 会对已完整的草稿大幅膨胀（同一草稿 194 字 → 582/801 字）；
  - 遇到指代不明草稿（「这个再改一下」）会输出「请优化以下提示词…」这类对优化器说话的元指令。
- `temperature` 0.7 → **0.25**：改写任务需要稳定复现而非发散。
- `maxTokens` 4096 → **8192**：部分网关先产 reasoning，预算过小会把正文挤空。

### Added

- **自适应低思考档**：启动后首次调用时用 `llm.resolveCallConfig` 逐个探测 `off` / `minimal`（不做 provider I/O），选中能显著降低延迟的档位并缓存；模型不支持则退回原行为。基准实测首字延迟 2.8–55s → 1.4–5s，输出质量不变。
- `repairRefs` 兜底：若模型仍丢了 `@`，在裸路径仍在时按草稿还原成 `@"path"`。
- 成功提示附带本次耗时（如「已优化 ✓ 2.1s」），`optimize()` 额外返回 `ms` 与 `effort` 便于诊断。

## [1.0.0] - 2026-10-23

### Added

- 首次开源发布，正式包名 `dsh-draft-optimizer`（与市场既有 `@y1x1n/dsh-prompt-optimizer` 区分）。
- composer dock ✦ 按钮：点击用当前默认模型优化草稿并原地替换，绝不自动发送。
- 流式生成（`llm.stream`）、忙碌 spinner、空草稿禁用、成功 ✓ / 失败 / 草稿冲突提示。
- 优化指令嵌入用户消息本体（不依赖 system 字段），并强化“草稿只是素材、禁止回答”规则。
- 中英文案与原创星形图标，MIT 许可。

### Notes

- 当前版本刻意**不参考对话上下文**：只处理输入框草稿本身。已知限制见 README「隐私与限制」。