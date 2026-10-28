/**
 * dsh-draft-optimizer 的 Typert 主机清单。
 * 模式照抄 dsh-cost-meter/lib/typert.host.js:strict codec 包装 + invocations + model 声明。
 */
import { z } from 'zod'

const strictCodec = (name, schema) => ({
  mode: 'strict',
  typeSymbol: 'dsh-draft-optimizer#' + name,
  schema,
  create: () => schema
})

export const TYPERT = {
  package: 'dsh-draft-optimizer',
  face: 'host',
  schemas: [],
  invocations: [
    {
      id: 'dsh-draft-optimizer#draftOptimizer/optimize',
      service: 'draftOptimizer',
      namespace: 'draftOptimizer',
      method: 'optimize',
      invocation: { kind: 'direct' },
      parameters: [
        { name: 'text', wire: 'text', source: 'json', codec: strictCodec('PromptText', z.string().min(1).max(100000)) },
        {
          name: 'sessionId',
          wire: 'sessionId',
          source: 'json',
          acceptsUndefined: true,
          codec: strictCodec('SessionId', z.string().max(512).optional())
        }
      ],
      result: strictCodec(
        'OptimizeResult',
        z.object({
          text: z.string().min(1),
          ms: z.number().optional(),
          effort: z.string().optional()
        })
      )
    }
  ],
  model: {
    services: [
      {
        description: '以当前默认模型优化输入框草稿并返回优化后的文本（不发送消息）。',
        summary: 'Optimize the current composer draft with the default model.',
        tags: ['draft-optimizer', 'prompt'],
        jsDoc:
          '/**\n * Prompt optimizer: rewrite the given draft into a stronger prompt\n * without sending it.\n */',
        key: 'draftOptimizer',
        exportName: 'DraftOptimizerService',
        members: [
          {
            kind: 'method',
            name: 'optimize',
            signature: 'optimize(text: string, sessionId?: string): Promise<OptimizeResult>',
            summary: 'Optimize the draft text via the default model.',
            jsDoc:
              '/**\n * Optimize the draft text via the default model.\n * @returns the optimized prompt text.\n */'
          }
        ],
        types: []
      }
    ],
    events: [],
    objects: []
  }
}

export default TYPERT