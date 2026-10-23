## 改动摘要

<!-- 用一两句话说明这个 PR 做什么、为什么 -->

## 改动范围

- [ ] `lib/index.js`（宿主服务 / 指令模板）
- [ ] `lib/client.js`（UI / RPC）
- [ ] `lib/typert.host.js`（Typert 清单）
- [ ] `locale/*` / 文档 / CI / 其他

## 验证

- [ ] `node --check lib/*.js` 通过
- [ ] `node tests/manifest.test.mjs` 通过
- [ ] 已重启 DSH 实测：点 ✦ → 草稿被替换且**未自动发送**
- [ ] （UI 改动）附前后截图

## 兼容性注意

- [ ] 未在 `apply()` 中手动 `ctx.typert.register()`
- [ ] `apply()` 内注册动作均有 try/catch 兜底