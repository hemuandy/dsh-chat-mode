import assert from 'node:assert/strict'
import test from 'node:test'
import { apply, inject } from '../lib/prompt.js'
import { DEFAULT_PROMPT, setPrompt } from '../lib/settings-store.js'

function fakeSystemPrompt() {
  const sections = []
  let suppressed = 0
  return {
    sections,
    get suppressed() { return suppressed },
    ctx: {
      systemPrompt: {
        section: (options) => {
          sections.push(options)
          return () => {}
        },
        suppressRuntimeContext: () => { suppressed += 1 },
      },
    },
  }
}

test('prompt plugin injects the systemPrompt service', () => {
  assert.deepEqual([...inject], ['systemPrompt'])
})

test('registers one complete persona section and suppresses runtime context', (t) => {
  const fake = fakeSystemPrompt()
  t.after(() => setPrompt(DEFAULT_PROMPT))

  setPrompt('first prompt')
  apply(fake.ctx)

  const { sections } = fake
  assert.equal(sections.length, 1)
  assert.equal(sections[0].name, 'deployment:persona-prefix')
  assert.equal(sections[0].order, 0)
  assert.equal(sections[0].complete, true)
  assert.equal(typeof sections[0].text, 'function')
  assert.equal(sections[0].text(), 'first prompt')
  assert.equal(fake.suppressed, 1)

  setPrompt('second prompt')
  assert.equal(sections[0].text(), 'second prompt', 'edits apply on the next assembly')
})
