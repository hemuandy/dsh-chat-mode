import assert from 'node:assert/strict'
import test from 'node:test'
import ChatModeNoTools from '../lib/no-tools.js'
import { setBillionTools } from '../lib/settings-store.js'

function makeCtx(names) {
  const calls = []
  const active = new Set()
  const listeners = new Map()
  let cleanup

  const ctx = {
    tools: {
      schemas: () => names.map((name) => ({ name })),
      restrict: (filter) => {
        calls.push(filter)
        active.add(filter)
        // Real restrict() emits tools/change; reproduce the synchronous echo.
        listeners.get('tools/change')?.()
        return () => {
          active.delete(filter)
          listeners.get('tools/change')?.()
        }
      },
    },
    on: (event, listener) => {
      listeners.set(event, listener)
      return () => listeners.delete(event)
    },
    effect: (factory) => {
      cleanup = factory()
      return () => cleanup?.()
    },
  }

  return { ctx, calls, active, listeners, cleanup: () => cleanup?.() }
}

test('off by default: denies every global tool, including billion-context', (t) => {
  setBillionTools(false)
  const { ctx, calls, cleanup } = makeCtx([
    'acp_status',
    'acp_cache',
    'acp_read_original_image',
    'compress',
    'decompress',
    'search_context',
    'read',
    'write',
    'bash',
    'web_search',
  ])
  t.after(cleanup)

  new ChatModeNoTools(ctx)

  assert.deepEqual(calls, [{
    deny: [
      'acp_status',
      'acp_cache',
      'acp_read_original_image',
      'compress',
      'decompress',
      'search_context',
      'read',
      'write',
      'bash',
      'web_search',
    ],
  }])
})

test('on: denies everything except billion-context tools', (t) => {
  setBillionTools(true)
  const { ctx, calls, cleanup } = makeCtx([
    'acp_status',
    'compress',
    'read',
    'write',
    'bash',
    'web_search',
  ])
  t.after(cleanup)

  new ChatModeNoTools(ctx)

  assert.deepEqual(calls, [{ deny: ['read', 'write', 'bash', 'web_search'] }])
})

test('toggling lifts the old mask and applies the new one live', (t) => {
  setBillionTools(false)
  const { ctx, calls, active, cleanup } = makeCtx([
    'acp_status',
    'compress',
    'read',
    'write',
  ])
  t.after(cleanup)
  t.after(() => setBillionTools(false))

  new ChatModeNoTools(ctx)
  assert.deepEqual(calls.at(-1), { deny: ['acp_status', 'compress', 'read', 'write'] })
  assert.equal(active.size, 1)

  setBillionTools(true)
  assert.deepEqual(calls.at(-1), { deny: ['read', 'write'] })
  assert.equal(active.size, 1, 'the old restriction is lifted, not stacked')

  setBillionTools(false)
  assert.deepEqual(calls.at(-1), { deny: ['acp_status', 'compress', 'read', 'write'] })
  assert.equal(active.size, 1)
})

test('hides late registrations while the preference is off', (t) => {
  setBillionTools(false)
  const { ctx, calls, listeners, cleanup } = makeCtx(['read'])
  t.after(cleanup)

  new ChatModeNoTools(ctx)
  assert.deepEqual(calls.at(-1), { deny: ['read'] })

  ctx.tools.schemas = () => [{ name: 'read' }, { name: 'bash' }]
  listeners.get('tools/change')()
  assert.deepEqual(calls.at(-1), { deny: ['read', 'bash'] })
})

test('does nothing when there are no global tools at all', (t) => {
  setBillionTools(false)
  const { ctx, calls, cleanup } = makeCtx([])
  t.after(cleanup)

  new ChatModeNoTools(ctx)

  assert.deepEqual(calls, [])
})

test('an enabled preference still hides everything when billion-context is absent', (t) => {
  setBillionTools(true)
  const { ctx, calls, cleanup } = makeCtx(['read', 'write'])
  t.after(cleanup)
  t.after(() => setBillionTools(false))

  new ChatModeNoTools(ctx)

  assert.deepEqual(calls, [{ deny: ['read', 'write'] }])
})
