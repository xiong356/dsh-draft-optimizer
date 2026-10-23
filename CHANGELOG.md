# Changelog

本项目的所有重要变更都会记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [1.0.0] - 2026-10-23

### Added

- 首次开源发布，正式包名 `dsh-draft-optimizer`（与市场既有 `@y1x1n/dsh-prompt-optimizer` 区分）。
- composer dock ✦ 按钮：点击用当前默认模型优化草稿并原地替换，绝不自动发送。
- 流式生成（`llm.stream`）、忙碌 spinner、空草稿禁用、成功 ✓ / 失败 / 草稿冲突提示。
- 优化指令嵌入用户消息本体（不依赖 system 字段），并强化“草稿只是素材、禁止回答”规则。
- 中英文案与原创星形图标，MIT 许可。

### Notes

- 当前版本刻意**不参考对话上下文**：只处理输入框草稿本身。已知限制见 README「隐私与限制」。