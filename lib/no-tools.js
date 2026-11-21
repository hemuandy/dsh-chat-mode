import { getBillionTools, onBillionToolsChange } from './settings-store.js'

/**
 * Chat-mode tool filter.
 *
 * The chat preset mounts no tool plugins of its own, but host-level plugins
 * (shell, file access, IM, Blender, …) register their tools globally and would
 * otherwise leak into every agent. This plugin runs inside the preset scope and
 * hides every global tool. When the `billionTools` preference is on, the
 * billion-context compression tools stay visible; when it is off (the default),
 * they are hidden too.
 *
 * `restrict()` returns the exact disposer for the layer it added, so a
 * preference change can lift the previous mask and apply a fresh one without
 * restarting the preset.
 */

const ALLOWED_EXACT = new Set(['compress', 'decompress', 'search_context'])

/** Names published by billion-context; absent installations simply never match. */
function isBillionContext(name) {
  return name.startsWith('acp_') || ALLOWED_EXACT.has(name)
}

export default class ChatModeNoTools {
  static inject = ['tools']

  constructor(ctx) {
    this.ctx = ctx
    this.lift = undefined
    this.applying = false
    this.disposed = false
    this.sync = this.sync.bind(this)

    this.sync()
    ctx.on('tools/change', this.sync)

    const off = onBillionToolsChange(this.sync)
    ctx.effect(() => () => {
      this.disposed = true
      off()
      this.lift?.()
      this.lift = undefined
    })
  }

  sync() {
    // Both restrict() and its disposer emit `tools/change`; this guard keeps
    // that echo from re-entering the mask update. Teardown also lifts the
    // restriction, so ignore the event if the layer is already gone.
    if (this.disposed || this.applying) return
    this.applying = true

    try {
      const names = this.ctx.tools.schemas().map((schema) => schema.name)
      const keepBillion = getBillionTools()
      const deny = names.filter((name) => !keepBillion || !isBillionContext(name))

      // Rebuild from scratch: restrictions intersect, so the old layer must be
      // lifted before a broader allowlist can take effect.
      this.lift?.()
      this.lift = undefined
      if (deny.length > 0) this.lift = this.ctx.tools.restrict({ deny })
    } finally {
      this.applying = false
    }
  }
}
