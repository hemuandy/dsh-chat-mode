import assert from 'node:assert/strict'
import test from 'node:test'
import ChatModeNoTools from '../lib/no-tools.js'

function makeCtx(names) {
  const calls = []
  const listeners = new Map()
  const ctx = {
    tools: {
      schemas: () => names.map((name) => ({ name })),
      restrict: (filter) => {
        calls.push(filter)
        listeners.get('tools/change')?.()
      },
    },
    on: (event, listener) => {
      listeners.set(event, listener)
      return () => listeners.delete(event)
    },
  }
  return { ctx, calls, listeners }
}

test('denies every global tool except billion-context tools', () => {
  const { ctx, calls } = makeCtx([
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

  new ChatModeNoTools(ctx)

  assert.deepEqual(calls, [{ deny: ['read', 'write', 'bash', 'web_search'] }])
})

test('hides late registrations and does not repeat itself', () => {
  const { ctx, calls, listeners } = makeCtx(['read'])
  new ChatModeNoTools(ctx)
  assert.deepEqual(calls, [{ deny: ['read'] }])

  ctx.tools.schemas = () => [{ name: 'read' }, { name: 'bash' }]
  listeners.get('tools/change')()
  assert.deepEqual(calls, [{ deny: ['read'] }, { deny: ['bash'] }])

  listeners.get('tools/change')()
  assert.equal(calls.length, 2)
})

test('does nothing when there are no tools to hide', () => {
  const { ctx, calls } = makeCtx(['acp_status', 'compress'])
  new ChatModeNoTools(ctx)
  assert.deepEqual(calls, [])
})
