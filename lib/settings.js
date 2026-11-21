import z from '@deepseek-ai/schemastery'
import { DEFAULT_PROMPT, setBillionTools, setPrompt } from './settings-store.js'

/**
 * Host half of the chat-mode preferences.
 *
 * Both fields are volatile on purpose: editing them must not restart the
 * preset. The settings page writes volatile fields live; the preset-scoped
 * filter and prompt plugins read the shared store.
 */
export const Config = z.object({
  billionTools: z.boolean()
    .description(
      'Allow billion-context compression tools in chat mode. '
      + 'Off keeps short chats lean; on lets long chats compress their history.',
    )
    .default(false)
    .volatile(),
  prompt: z.string()
    .description('System prompt used by the chat-mode agent.')
    .default(DEFAULT_PROMPT)
    .volatile(),
})

/** Read either a live Volatile reference (Cordis) or a plain value in tests. */
function readField(config, key) {
  const field = config?.[key]
  if (field !== null && typeof field === 'object' && typeof field.get === 'function') {
    return field.get()
  }
  return field
}

export function apply(ctx, config) {
  const sync = () => {
    // Volatile fields are stable references; the loader replaces their value
    // in place and the reference itself never changes. Do not read
    // `ctx.config` here: the context does not inject the `config` service,
    // and doing so throws "cannot get property config without inject".
    setBillionTools(readField(config, 'billionTools') === true)
    setPrompt(readField(config, 'prompt'))
  }

  sync()
  ctx.on('loader/volatile-update', sync)
}
