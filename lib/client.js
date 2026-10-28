/**
 * dsh-draft-optimizer 客户端半区(Ui Platform bundle)。
 *
 * 负责:
 *  1. 向 conversation.composer.dock 注入一个 24x24 小按钮(id=draft-optimizer,order=90);
 *  2. 点击后读取当前草稿,经 remote.draftOptimizer.optimize() 请求优化,
 *     成功后用 inputActions.setDraft() 原地替换草稿 —— 绝不自动发送;
 *  3. 忙碌 spinner、空草稿禁用、成功/失败/冲突提示(2.5s 自动消失)。
 */
window.__ModuleLoader__.load({
  id: 'dsh-draft-optimizer',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useState, useEffect, useCallback } = React

    const STRINGS = {
      zh: {
        title: '优化提示词',
        optimizing: '优化中…',
        done: '已优化 ✓',
        failed: '优化失败',
        conflict: '草稿已变化，未替换',
        empty: '草稿为空'
      },
      en: {
        title: 'Optimize prompt',
        optimizing: 'Optimizing…',
        done: 'Optimized ✓',
        failed: 'Optimization failed',
        conflict: 'Draft changed, not replaced',
        empty: 'Draft is empty'
      }
    }
    const lang =
      typeof navigator !== 'undefined' && /^zh/i.test(navigator.language || '') ? 'zh' : 'en'
    const T = STRINGS[lang] || STRINGS.en

    // ---- remote descriptors(客户端宽松 schema,与 host 清单同构) ----
    const loose = (parse) => ({ parse })
    const codec = (name, schema) => ({
      mode: 'strict',
      typeSymbol: 'dsh-draft-optimizer#' + name,
      schema,
      create: () => schema
    })
    const param = (name, schema, acceptsUndefined) => ({
      name,
      wire: name,
      source: 'json',
      codec: codec(name, schema),
      ...(acceptsUndefined ? { acceptsUndefined: true } : {})
    })
    const ON = {
      package: 'dsh-draft-optimizer',
      descriptors: [
        {
          id: 'dsh-draft-optimizer#draftOptimizer/optimize',
          service: 'draftOptimizer',
          namespace: 'draftOptimizer',
          method: 'optimize',
          invocation: { kind: 'direct' },
          parameters: [
            param('text', loose((v) => v)),
            param('sessionId', loose((v) => v), true)
          ],
          result: codec('OptimizeResult', loose((v) => v))
        }
      ]
    }

    const SPARK_BIG =
      'M12 2.5C12.7 7.9 16.1 11.3 21.5 12C16.1 12.7 12.7 16.1 12 21.5C11.3 16.1 7.9 12.7 2.5 12C7.9 11.3 11.3 7.9 12 2.5Z'
    const SPARK_MID =
      'M19 14C19.36 16.1 20.15 16.9 22 17.3C20.15 17.66 19.36 18.48 19 20.5C18.64 18.48 17.85 17.66 16 17.3C17.85 16.9 18.64 16.1 19 14Z'
    const SPARK_SMALL =
      'M5.8 12.6C6.05 14.1 6.6 14.65 8 15C6.6 15.35 6.05 15.9 5.8 17.4C5.55 15.9 5 15.35 3.6 15C5 14.65 5.55 14.1 5.8 12.6Z'

    const STYLE = `
.po-wrap{display:inline-flex;align-items:center;gap:6px;height:28px;margin-left:4px;flex:0 0 auto}
.po-btn{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;padding:0;border:none;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary,#8a8f98);cursor:pointer;outline:none}
.po-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.12));color:var(--dsw-alias-label-primary,#e5e5e5)}
.po-btn:disabled{opacity:.4;cursor:default}
.po-spinner{width:12px;height:12px;border-radius:50%;border:1.5px solid var(--dsw-alias-interactive-border,rgba(128,128,128,.35));border-top-color:var(--dsw-alias-label-primary,#e5e5e5);animation:po-spin .8s linear infinite}
@keyframes po-spin{to{transform:rotate(360deg)}}
.po-notice{font-size:12px;line-height:20px;color:var(--dsw-alias-label-secondary,#8a8f98);white-space:nowrap;user-select:none}
.po-notice.po-error{color:var(--dsw-alias-label-danger,#e5534b)}
`

    function DraftOptimizerButton({ optimize, useInput, inputActions, sessionId }) {
      const [busy, setBusy] = useState(false)
      const [notice, setNotice] = useState(null)
      const draft = typeof useInput === 'function' ? useInput((s) => (s ? s.draft || '' : '')) : ''
      const empty = !draft || draft.trim() === ''

      useEffect(() => {
        if (!notice) return undefined
        const id = setTimeout(() => setNotice(null), 2500)
        return () => clearTimeout(id)
      }, [notice])

      const onClick = useCallback(async () => {
        if (busy || empty) return
        const snapshot = draft
        setBusy(true)
        setNotice(null)
        try {
          // 防冲突:提交前的草稿若已被用户改动,则不覆盖。
          let current = snapshot
          if (useInput && typeof useInput.getSnapshot === 'function') {
            const snap = useInput.getSnapshot()
            current = snap ? snap.draft || '' : snapshot
          }
          if (current !== snapshot) {
            setNotice({ kind: 'conflict', text: T.conflict })
            return
          }
          const value = await optimize(snapshot, sessionId)
          const text = value && typeof value.text === 'string' ? value.text.trim() : ''
          if (!text) {
            setNotice({ kind: 'error', text: T.failed })
            return
          }
          if (!inputActions || typeof inputActions.setDraft !== 'function') {
            setNotice({ kind: 'error', text: T.failed })
            return
          }
          inputActions.setDraft(text)
          const ms = value && typeof value.ms === 'number' ? value.ms : 0
          setNotice({ kind: 'done', text: T.done + (ms > 0 ? ' ' + (ms / 1000).toFixed(1) + 's' : '') })
        } catch (err) {
          const msg = err && err.message ? String(err.message) : ''
          setNotice({ kind: 'error', text: T.failed + (msg ? '：' + msg : '') })
        } finally {
          setBusy(false)
        }
      }, [busy, empty, draft, optimize, sessionId, inputActions, useInput])

      const disabled = busy || empty
      return h(
        'div',
        { className: 'po-wrap' },
        h(
          'button',
          {
            type: 'button',
            className: 'po-btn' + (busy ? ' po-busy' : ''),
            disabled,
            onClick,
            'aria-label': T.title,
            title: empty ? T.empty : T.title
          },
          busy
            ? h('span', { className: 'po-spinner' })
            : h(
                'svg',
                { viewBox: '0 0 24 24', width: 15, height: 15, 'aria-hidden': true },
                h('path', { d: SPARK_BIG, fill: 'currentColor' }),
                h('path', { d: SPARK_MID, fill: 'currentColor' }),
                h('path', { d: SPARK_SMALL, fill: 'currentColor' })
              )
        ),
        notice
          ? h('span', { className: 'po-notice' + (notice.kind === 'error' ? ' po-error' : '') }, notice.text)
          : null
      )
    }

    return {
      inject: ['slots', 'remote'],
      apply(ctx) {
        // 样式:注入一次,注销时清理。
        const styleEl = document.createElement('style')
        styleEl.textContent = STYLE
        document.head.appendChild(styleEl)
        ctx.effect(
          () => () => {
            styleEl.remove()
          },
          'draft-optimizer: styles'
        )

        const s = ctx.remote
        if (s && typeof s.$mount === 'function') {
          const mount = s.$mount(ON)
          const contribute = typeof mount.then === 'function' ? mount : Promise.resolve(mount)
          contribute
            .then((dispose) => {
              if (dispose) {
                ctx.effect(
                  () => () => {
                    dispose()
                  },
                  'draft-optimizer: remote contribution'
                )
              }
            })
            .catch((err) => {
              console.warn('[draft-optimizer] remote 挂载失败', err)
            })
        } else {
          console.warn('[draft-optimizer] remote 不可用，点击优化将在运行时重试')
        }

        // remote 命名空间可能晚于模块加载就绪:懒解析 + 每次点击时重试。
        let api = ctx.get ? ctx.get('remote.draftOptimizer') : undefined
        let mountedOnce = false
        const ensureApi = () => {
          if (!api) api = ctx.get ? ctx.get('remote.draftOptimizer') : undefined
          return api || undefined
        }

        async function call(method, args) {
          let target = ensureApi()
          if (!target && s && typeof s.$mount === 'function' && !mountedOnce) {
            // 首次挂载可能晚于点击:现场重挂一次再取。
            mountedOnce = true
            try {
              const dispose = await s.$mount(ON)
              if (dispose) {
                ctx.effect(
                  () => () => {
                    dispose()
                  },
                  'draft-optimizer: remote contribution (retry)'
                )
              }
            } catch (err) {
              console.warn('[draft-optimizer] remote 挂载重试失败', err)
            }
            target = ensureApi()
          }
          if (!target) {
            throw new Error('optimizer service unavailable (remote.draftOptimizer)')
          }
          const res = await target[method](...args)
          if (res === null || typeof res !== 'object' || res.ok !== true) {
            throw new Error(res && res.error && res.error.message ? res.error.message : 'RPC failed')
          }
          return res.value
        }

        ctx.slots.inject(
          'conversation.composer.dock',
          () =>
            ctx.slots.register(
              {
                name: 'conversation.composer.dock',
                id: 'draft-optimizer',
                order: 90,
                inject: () => ({ optimize: (text, sessionId) => call('optimize', [text, sessionId]) })
              },
              DraftOptimizerButton
            )
        )
      }
    }
  }
})