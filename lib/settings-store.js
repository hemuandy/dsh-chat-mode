/**
 * Shared in-process switch between the standalone settings plugin and the
 * preset-scoped tool filter.
 *
 * The settings plugin owns the Config field; the filter runs inside the chat
 * preset scope and cannot read the settings plugin's config object directly.
 * Both live in the same Host process. The state lives on `globalThis` under a
 * registered symbol so it also works if the host and preset module loaders
 * instantiate this module more than once.
 */

const KEY = Symbol.for('@local/dsh-chat-mode/billion-tools')

const state = globalThis[KEY] ??= {
  value: false,
  listeners: new Set(),
}

/** @returns whether billion-context tools are currently allowed. */
export function getBillionTools() {
  return state.value
}

/**
 * Update the switch and notify every mounted filter.
 * @param value - new value; only `true` enables the tools.
 */
export function setBillionTools(value) {
  const next = value === true
  if (next === state.value) return
  state.value = next
  for (const listener of [...state.listeners]) {
    try {
      listener(next)
    } catch (error) {
      // A broken filter must not prevent the remaining filters from syncing.
      console.error('chat-mode: billion-tools listener failed', error)
    }
  }
}

/**
 * Observe switch changes.
 * @param listener - called with the new value.
 * @returns disposer removing the listener.
 */
export function onBillionToolsChange(listener) {
  state.listeners.add(listener)
  return () => state.listeners.delete(listener)
}
