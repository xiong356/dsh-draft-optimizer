/**
 * dsh-draft-optimizer 清单与纯函数测试。
 * 用法: node tests/manifest.test.mjs（也可由 CI 调用）。
 * 不依赖测试框架,断言失败时以非零退出码结束。
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { TYPERT } from '../lib/typert.host.js'
import { stripFence, buildUserMessage } from '../lib/index.js'

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
check('包含任务指令', text.includes('【任务】'))
check('包含反回答规则', text.includes('绝对不要回答它'))
check('包含草稿且被三引号包裹', text.includes('"""\n帮我查天气\n"""'))
check('不包含外部内容', !text.includes('QWEN') && !text.includes('Bearer'))

console.log('== 结果 ==')
if (failures > 0) {
  console.error(`${failures} 项失败`)
  process.exit(1)
}
console.log('全部通过')