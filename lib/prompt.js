/**
 * Preset-scoped system prompt.
 *
 * Registers the deployment persona prefix slot as a complete section, so the
 * chat preset uses exactly the text stored in the settings page and nothing
 * from the deployment defaults (identity, tool guidance, skills, ...).
 * The text provider reads the shared store on every assembly, so saving a new
 * prompt applies on the next turn without a restart.
 */

import { getPrompt } from './settings-store.js'

export const inject = ['systemPrompt']

export function apply(ctx) {
  ctx.systemPrompt.section({
    name: 'deployment:persona-prefix',
    order: 0,
    complete: true,
    text: () => getPrompt(),
  })
  // Keep the same minimal-context policy the old persona row had.
  ctx.systemPrompt.suppressRuntimeContext()
}
