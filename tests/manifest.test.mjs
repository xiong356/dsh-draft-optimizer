/**
 * dsh-draft-optimizer 清单与纯函数测试。
 * 用法: node tests/manifest.test.mjs（也可由 CI 调用）。
 * 不依赖测试框架,断言失败时以非零退出码结束。
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { TYPERT } from '../lib/typert.host.js'
import { stripFence, buildUserMessage, repairRefs, SYSTEM_PROMPT } from '../lib/index.js'

let failures = 0
const check = (name, ok, detail = '') => {
  if (ok) {
    console.log('  ok -', name)
  } else {
    failures += 1
    console.error('FAIL -', name, detail ? ':: ' + detail : '')
  }
}

const here = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(join(here, '..', 'package.json'), 'utf8'))

console.log('== Typert 清单形状（对齐 typert-loader 的关键校验） ==')
check('TYPERT 是对象', TYPERT && typeof TYPERT === 'object')
check('package 与 package.json name 一致', TYPERT.package === pkg.name, `got ${TYPERT.package}`)
check('face 为 host', TYPERT.face === 'host')
check('schemas 为数组', Array.isArray(TYPERT.schemas))
check('model.events / model.objects 为数组', Array.isArray(TYPERT.model.events) && Array.isArray(TYPERT.model.objects))

for (const inv of TYPERT.invocations) {
  check(`invocation ${inv.method} 有 id/service/namespace`, typeof inv.id === 'string' && typeof inv.service === 'string' && typeof inv.namespace === 'string')
  check(`invocation ${inv.method} kind 为 direct`, inv.invocation && inv.invocation.kind === 'direct')
  check(
    `invocation ${inv.method} id 前缀为 ${pkg.name}#`,
    inv.id === `${pkg.name}#${inv.namespace}/${inv.method}`,
    inv.id
  )
  const wires = inv.parameters.map((p) => p.wire)
  check(`invocation ${inv.method} 参数 wire 唯一`, new Set(wires).size === wires.length)
  for (const p of inv.parameters) {
    check(`参数 ${p.name} codec 为 strict 且可创建`, p.codec && p.codec.mode === 'strict' && typeof p.codec.create === 'function')
    check(`参数 ${p.name} 有 parse 能力`, typeof p.codec.schema.parse === 'function')
  }
  check('result codec 为 strict', inv.result && inv.result.mode === 'strict')
}
const serviceKeys = new Set(TYPERT.model.services.map((s) => s.key))
for (const inv of TYPERT.invocations) {
  check(`invocation service ${inv.service} 在 model.services 中声明`, serviceKeys.has(inv.service))
}
for (const svc of TYPERT.model.services) {
  check(`服务 ${svc.key} types 为数组`, Array.isArray(svc.types))
  check(`服务 ${svc.key} 有 members`, Array.isArray(svc.members) && svc.members.length > 0)
}

console.log('== stripFence ==')
check('去除 ``` 围栏', stripFence('```\n你好\n```') === '你好')
check('去除带语言标记的围栏', stripFence('```markdown\nA\nB\n```') === 'A\nB')
check('无围栏原样返回', stripFence('  hello  ') === 'hello')

console.log('== buildUserMessage ==')
const blocks = buildUserMessage('帮我查天气')
const text = blocks[0].text
check('返回单文本块', blocks.length === 1 && blocks[0].type === 'text')
check('包含身份与铁律', text.includes('【你的身份】') && text.includes('【铁律】'))
check('包含反回答规则', text.includes('绝不回答、执行、评论或总结'))
check('包含不虚构信息规则', text.includes('不虚构') && text.includes('<尖括号占位符>'))
check('包含 @"引用" 原样保留规则', text.includes('@"引用"'))
check('包含长度上限', text.includes('不超过 800 字') && text.includes('草稿的 2 倍'))
check('包含指代不明的处理规则', text.includes('指代不明'))
check('包含 few-shot 示例', text.includes('【示例】'))
check('包含草稿且被三引号包裹', text.includes('"""\n帮我查天气\n"""'))
check('不包含外部内容', !text.includes('QWEN') && !text.includes('Bearer'))
check('SYSTEM_PROMPT 声明只输出全文', SYSTEM_PROMPT.includes('你唯一的输出'))

console.log('== repairRefs ==')
check(
  '把裸路径还原成 @"路径"',
  repairRefs('见 @"src/app.ts" 里的 helper', '见 src/app.ts 里的 helper') === '见 @"src/app.ts" 里的 helper'
)
check(
  '把反引号裸路径也还原',
  repairRefs('用 @"src/app.ts" 重构', '用 `src/app.ts` 重构') === '用 `@"src/app.ts"` 重构'
)
check('已保留引用时不重复加 @', repairRefs('见 @"a.ts"', '见 @"a.ts"') === '见 @"a.ts"')
check('草稿无引用时原样返回', repairRefs('没有引用', '没有引用') === '没有引用')
check('输出缺路径时不凭空补', repairRefs('见 @"a.ts"', '完全没有提到') === '完全没有提到')
check('多处同路径全部还原', repairRefs('@"a.ts" 和 @"a.ts"', 'a.ts 与 a.ts') === '@"a.ts" 与 @"a.ts"')

console.log('== 结果 ==')
if (failures > 0) {
  console.error(`${failures} 项失败`)
  process.exit(1)
}
console.log('全部通过')