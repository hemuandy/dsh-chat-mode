/**
 * Shared in-process switch between the standalone settings plugin and the
 * preset-scoped tool filter.
 *
 * The settings plugin owns the Config field; the filter runs inside the chat
 * preset scope and cannot read the settings plugin's config object directly.
 * Both live in the same Host process, so a tiny module-level store is enough
 * and keeps the filter independent of the settings-service wiring.
 */

const listeners = new Set()
let billionTools = false

/** @returns whether billion-context tools are currently allowed. */
export function getBillionTools() {
  return billionTools
}

/**
 * Update the switch and notify every mounted filter.
 * @param value - new value; only `true` enables the tools.
 */
export function setBillionTools(value) {
  const next = value === true
  if (next === billionTools) return
  billionTools = next
  for (const listener of [...listeners]) {
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
  listeners.add(listener)
  return () => listeners.delete(listener)
}
