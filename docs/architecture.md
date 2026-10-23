# 架构说明

```
┌───────────────────────────── 客户端 (Web UI) ─────────────────────────────┐
│ conversation.composer.dock 插槽                                           │
│   occupant: id=draft-optimizer, order=90                                  │
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
│    2. llm.stream({provider, model, temperature:0.7, maxTokens:4096,      │
│                  system, messages:[user(buildUserMessage(text))]})       │
│    3. 收集 text-delta（按 index 累加）＋ block-end 整块兜底                │
│    4. stripFence 去围栏 → 返回 { text }                                   │
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
   这样保证输出始终是可独立发送的完整提示词（代价：指代不明的草稿无法自动补全）。

4. **只替换不发送**：客户端成功回调调用 `inputActions.setDraft(text)`，
   不调用 `submit()`；提交前的草稿快照若与最新值不一致则放弃替换（conflict 提示）。

5. **严禁手动 typert.register**：typert-loader 会按 entry 挂载自动注册 `./typert`；
   手动重复注册 → “already registered” → 启动期 fiber reload → 网关 strict 定义撤回
   → 桌面端 welcome RPC 失败 → 应用弹“Disable third-party plugins”恢复对话框。

6. **宿主 apply() 防御式注册**：任何注册动作都 try/catch 兜底，失败只降级为
   “插件不可用”，绝不拖垮 host 启动。