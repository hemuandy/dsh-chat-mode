import z from '@deepseek-ai/schemastery'
import { setBillionTools } from './settings-store.js'

/**
 * Host half of the chat-mode preference.
 *
 * `billionTools` is volatile on purpose: flipping it must not restart the
 * preset, and the settings page edits volatile fields live. The filter reads
 * the shared store and re-applies its restriction on every change.
 */
export const Config = z.object({
  billionTools: z.boolean()
    .description(
      'Allow billion-context compression tools in chat mode. '
      + 'Off keeps short chats lean; on lets long chats compress their history.',
    )
    .default(false)
    .volatile(),
})

/** Read either a live Volatile reference (Cordis) or a plain value in tests. */
function readBillionTools(config) {
  const field = config?.billionTools
  if (field !== null && typeof field === 'object' && typeof field.get === 'function') {
    return field.get() === true
  }
  return field === true
}

export function apply(ctx, config) {
  const sync = () => {
    // Volatile fields are stable references; the loader replaces their value
    // in place and the reference itself never changes.
    setBillionTools(readBillionTools(ctx.config ?? config))
  }

  sync()
  ctx.on('loader/volatile-update', sync)
}
