import assert from 'node:assert/strict'
import test from 'node:test'
import { Config, apply } from '../lib/settings.js'
import { getBillionTools, setBillionTools } from '../lib/settings-store.js'

function volatile(initial) {
  let value = initial
  return {
    get: () => value,
    set: (next) => { value = next },
  }
}

test('Config exposes one volatile boolean that defaults to false', () => {
  const json = Config.toJSON()
  const root = json.refs[json.uid]
  const field = json.refs[root.dict.billionTools]
  assert.equal(root.type, 'object')
  assert.equal(field.type, 'boolean')
  assert.equal(field.meta.volatile, true)
  assert.equal(field.meta.default, false)
})

test('apply reads the Volatile reference, not its truthiness', () => {
  const listeners = new Map()
  const field = volatile(false)
  const config = { billionTools: field }
  const ctx = {
    config,
    on: (event, listener) => {
      listeners.set(event, listener)
      return () => listeners.delete(event)
    },
  }

  setBillionTools(true)
  apply(ctx, config)
  assert.equal(getBillionTools(), false, 'a Volatile object must not count as true')

  field.set(true)
  listeners.get('loader/volatile-update')()
  assert.equal(getBillionTools(), true)

  field.set(false)
  listeners.get('loader/volatile-update')()
  assert.equal(getBillionTools(), false)
})

test('apply falls back to the passed config when ctx.config is absent', () => {
  const listeners = new Map()
  const field = volatile(true)
  const config = { billionTools: field }
  const ctx = {
    on: (event, listener) => {
      listeners.set(event, listener)
      return () => listeners.delete(event)
    },
  }

  setBillionTools(false)
  apply(ctx, config)
  assert.equal(getBillionTools(), true)
})
