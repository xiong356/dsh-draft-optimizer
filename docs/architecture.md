# 架构说明

```
┌───────────────────────────── 客户端 (Web UI) ─────────────────────────────┐
│ 同一 occupant 注册到两个相位互斥的插槽(id=draft-optimizer, order=90)       │
│   conversation.composer.dock → active 对话(输入框下方 dock)                │
│   conversation.hero.options  → 新建对话(空白会话 hero 屏右侧)              │
│   DraftOptimizerButton ── useInput(s => s.draft) 读取草稿                  │
│        │ 点击                                                             │
│        ▼                                                                 │
│   call('optimize', [text, sessionId])                                    │
│   ctx.get('remote.draftOptimizer')  ← Typert 网关（remote.<namespace>）    │
└───────────────┬──────────────────────────────────────────────────────────┘
                │ RPC（信封 {ok:true,value} | {ok:false,error:{message}}）
┌───────────────▼──────────────────────────────────────────────────────────┐
│ 宿主 (Host)                                                              │
│  draftOptimizer 服务 (lib/index.js)                                      │
│    1. agentDefaultModel.currentSelection() → provider/model               │
│    2. llm.stream({provider, model, temperature:0.25, maxTokens:8192,     │
│                  system, messages:[user(buildUserMessage(text, cfg))]})  │
│    3. 收集 text-delta（按 index 累加）＋ block-end 整块兜底                │
│    4. stripFence 去围栏 → repairRefs 还原 @"path" 引用                     │
│    5. cfg.clarify 时 appendClarification 追加澄清条款 → { text }          │
│  Typert 清单 (lib/typert.host.js)：typert-loader 在 entry 挂载时自动注册    │
└──────────────────────────────────────────────────────────────────────────┘
```

## 关键设计决策

1. **指令嵌入 user 消息本体**（`buildUserMessage`）：实测网关对 `system` 完全遵守，
   但 DSH 内部 `llm/stream` 转发链路会丢弃 `options.system`，导致模型只看到草稿、
   把草稿当问题回答。嵌入本体后无论 system 是否送达都生效。

2. **content 必须是块数组**：pi-ai 适配器对 `message.content` 为字符串时行为异常并
   静默吞错（流零 chunk）。因此始终传 `[{type:'text',text}]`。

3. **不参考对话上下文**：请求只含 system + 一条 user 消息，不携带会话历史。
   这样保证输出始终是可独立发送的完整提示词（代价：指代不明的草稿无法自动补全，
   因此 1.2.0 起默认在末尾追加「执行前澄清」条款，让执行方先提问再动手）。

4. **只替换不发送**：客户端成功回调调用 `inputActions.setDraft(text)`，
   不调用 `submit()`；提交前的草稿快照若与最新值不一致则放弃替换（conflict 提示）。

5. **严禁手动 typert.register**：typert-loader 会按 entry 挂载自动注册 `./typert`；
   手动重复注册 → “already registered” → 启动期 fiber reload → 网关 strict 定义撤回
   → 桌面端 welcome RPC 失败 → 应用弹“Disable third-party plugins”恢复对话框。

6. **宿主 apply() 防御式注册**：任何注册动作都 try/catch 兜底，失败只降级为
   “插件不可用”，绝不拖垮 host 启动。

7. **双插槽注册（1.1.1 修复“新建对话窗口没有按钮”）**：`ui-conversation` 的
   composer 在新建对话（空白 Session）时以 `variant="hero"` 渲染，而
   `conversation.composer.dock` 只在 `variant === "composer"` 时渲染；
   同一相位下 `conversation.hero.options`（list/session，官方文档：“New Session
   行中右对齐的紧凑选项，只在有 Session 时渲染”）会渲染。两者按相位互斥，
   所以同一按钮同时注册到这两个插槽即可覆盖两种界面，且不会重复。
   两个插槽都是 session 作用域，标准 props（`useInput` / `inputActions` /
   `sessionId`）一致，组件无需改动。

8. **选项走 cordis config（1.2.0）**：插件 `apply(ctx, config)` 接收 profile
   `cordis.patch.yml` 中该条目的 `config` 字段，`normalizeConfig` 收敛为
   `{ clarify, placeholders, identity }`；`buildUserMessage` 据此动态生成占位符/
   身份/示例规则，`cfg.clarify === false` 时跳过 `appendClarification`。