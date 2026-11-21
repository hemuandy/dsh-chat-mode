/**
 * Shared in-process state between the standalone settings plugin and the
 * preset-scoped plugins (tool filter and prompt).
 *
 * The settings plugin owns the Config fields; the preset plugins cannot read
 * that config object directly. Both live in the same Host process. The state
 * lives on `globalThis` under a registered symbol so it also works if the host
 * and preset module loaders instantiate this module more than once.
 */

const KEY = Symbol.for('@local/dsh-chat-mode/settings')

/** Default minimal system prompt; also used when the stored prompt is unset. */
export const DEFAULT_PROMPT = "You are a helpful, concise assistant. Reply in the user's language."

const state = globalThis[KEY] ??= {
  billionTools: false,
  prompt: DEFAULT_PROMPT,
  listeners: new Set(),
}

/** @returns whether billion-context tools are currently allowed. */
export function getBillionTools() {
  return state.billionTools
}

/** @returns the current system prompt text. */
export function getPrompt() {
  return state.prompt
}

function notify() {
  for (const listener of [...state.listeners]) {
    try {
      listener()
    } catch (error) {
      // A broken consumer must not prevent the remaining consumers from syncing.
      console.error('chat-mode: settings listener failed', error)
    }
  }
}

/**
 * Update the tool switch. Only `true` enables the tools.
 * @param value - new value.
 */
export function setBillionTools(value) {
  const next = value === true
  if (next === state.billionTools) return
  state.billionTools = next
  notify()
}

/**
 * Update the system prompt.
 * @param value - new prompt; non-strings fall back to {@link DEFAULT_PROMPT}.
 */
export function setPrompt(value) {
  const next = typeof value === 'string' ? value : DEFAULT_PROMPT
  if (next === state.prompt) return
  state.prompt = next
  notify()
}

/**
 * Observe either setting changing.
 * @param listener - called without arguments after a change.
 * @returns disposer removing the listener.
 */
export function onChatModeChange(listener) {
  state.listeners.add(listener)
  return () => state.listeners.delete(listener)
}
