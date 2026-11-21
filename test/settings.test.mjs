import assert from 'node:assert/strict'
import test from 'node:test'
import { Config, apply } from '../lib/settings.js'
import {
  DEFAULT_PROMPT,
  getBillionTools,
  getPrompt,
  setBillionTools,
  setPrompt,
} from '../lib/settings-store.js'

function volatile(initial) {
  let value = initial
  return {
    get: () => value,
    set: (next) => { value = next },
  }
}

function fakeContext() {
  const listeners = new Map()
  return {
    listeners,
    ctx: {
      on: (event, listener) => {
        listeners.set(event, listener)
        return () => listeners.delete(event)
      },
    },
  }
}

test('Config exposes two volatile fields with the documented defaults', () => {
  const json = Config.toJSON()
  const root = json.refs[json.uid]
  const billionTools = json.refs[root.dict.billionTools]
  const prompt = json.refs[root.dict.prompt]

  assert.equal(root.type, 'object')
  assert.equal(billionTools.type, 'boolean')
  assert.equal(billionTools.meta.volatile, true)
  assert.equal(billionTools.meta.default, false)
  assert.equal(prompt.type, 'string')
  assert.equal(prompt.meta.volatile, true)
  assert.equal(prompt.meta.default, DEFAULT_PROMPT)
})

test('apply reads Volatile references, never their truthiness', (t) => {
  const { ctx, listeners } = fakeContext()
  const billionTools = volatile(false)
  const prompt = volatile('custom prompt')
  const config = { billionTools, prompt }

  t.after(() => {
    setBillionTools(false)
    setPrompt(DEFAULT_PROMPT)
  })

  setBillionTools(true)
  setPrompt('stale')
  apply(ctx, config)

  assert.equal(getBillionTools(), false, 'a Volatile object must not count as true')
  assert.equal(getPrompt(), 'custom prompt')

  billionTools.set(true)
  prompt.set('updated prompt')
  listeners.get('loader/volatile-update')()
  assert.equal(getBillionTools(), true)
  assert.equal(getPrompt(), 'updated prompt')

  billionTools.set(false)
  listeners.get('loader/volatile-update')()
  assert.equal(getBillionTools(), false)
})

test('apply uses the captured config and never reads ctx.config', (t) => {
  const { ctx } = fakeContext()
  const config = { billionTools: volatile(true), prompt: volatile('hello') }
  Object.defineProperty(ctx, 'config', {
    get() {
      throw new Error('ctx.config must not be read')
    },
  })

  t.after(() => {
    setBillionTools(false)
    setPrompt(DEFAULT_PROMPT)
  })

  assert.doesNotThrow(() => apply(ctx, config))
  assert.equal(getBillionTools(), true)
  assert.equal(getPrompt(), 'hello')
})

test('a missing or non-string prompt falls back to the default', (t) => {
  const { ctx } = fakeContext()
  t.after(() => {
    setBillionTools(false)
    setPrompt(DEFAULT_PROMPT)
  })

  setPrompt('temporary')
  apply(ctx, { billionTools: false })
  assert.equal(getPrompt(), DEFAULT_PROMPT)

  setPrompt('temporary again')
  apply(ctx, { billionTools: false, prompt: 42 })
  assert.equal(getPrompt(), DEFAULT_PROMPT)
})
