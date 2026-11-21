/**
 * Chat-mode tool filter.
 *
 * The chat preset mounts no tool plugins of its own, but host-level plugins
 * (shell, file access, IM, Blender, …) register their tools globally and would
 * otherwise leak into every agent. This plugin runs inside the preset scope and
 * hides every global tool except the billion-context compression tools.
 *
 * If billion-context is not installed, none of the allowed names exist, so all
 * tools are hidden and the preset behaves exactly like a tool-free preset.
 */

const ALLOWED_EXACT = new Set(['compress', 'decompress', 'search_context'])

/** billion-context publishes acp_status / acp_cache / acp_read_original_image. */
function isAllowed(name) {
  return name.startsWith('acp_') || ALLOWED_EXACT.has(name)
}

export default class ChatModeNoTools {
  static inject = ['tools']

  constructor(ctx) {
    this.ctx = ctx
    this.denied = new Set()
    this.applying = false
    this.sync = this.sync.bind(this)

    this.sync()
    ctx.on('tools/change', this.sync)
  }

  sync() {
    if (this.applying) return
    this.applying = true

    try {
      const names = this.ctx.tools.schemas().map((schema) => schema.name)
      const deny = names.filter((name) => !isAllowed(name) && !this.denied.has(name))
      if (deny.length === 0) return

      // Record names before calling restrict(): restrict() emits tools/change,
      // and the re-entrant sync must not submit the same names twice.
      for (const name of deny) this.denied.add(name)

      try {
        this.ctx.tools.restrict({ deny })
      } catch (error) {
        for (const name of deny) this.denied.delete(name)
        throw error
      }
    } finally {
      this.applying = false
    }
  }
}
