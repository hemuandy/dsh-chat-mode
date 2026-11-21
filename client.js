/**
 * Chat-mode preference row for Settings → General.
 *
 * Shipped as a raw browser artifact: DSH serves this file from the bundle's
 * `dsh.client` manifest and the module loader evaluates it lazily. It talks to
 * the Host with the same remote settings face the built-in settings UI uses.
 */
window.__ModuleLoader__.load({
  id: '@local/dsh-chat-mode',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    /** Profile entry id of the settings plugin row in cordis.patch.yml. */
    const NS = 'chat-mode-settings'
    const LABEL = '聊天模式：启用 billion-context 工具'
    const DESC = '关闭时 chat 模式不加载压缩/上下文工具，短对话更省 token；开启后长对话可用压缩节省上下文。'

    const styles = {
      row: {
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '16px',
        padding: '12px 0',
      },
      copy: { minWidth: 0, flex: '1 1 auto' },
      label: {
        display: 'block',
        fontSize: '13px',
        fontWeight: 600,
        lineHeight: 1.5,
        color: 'var(--dsh-text-primary, inherit)',
        cursor: 'pointer',
      },
      desc: {
        marginTop: '4px',
        fontSize: '12px',
        lineHeight: 1.55,
        color: 'var(--dsh-text-secondary, #888)',
      },
      error: {
        marginTop: '4px',
        fontSize: '12px',
        lineHeight: 1.5,
        color: 'var(--dsh-danger, #d33)',
      },
      checkbox: {
        flex: '0 0 auto',
        width: '16px',
        height: '16px',
        marginTop: '3px',
        accentColor: 'var(--dsh-accent, #4d6bfe)',
        cursor: 'pointer',
      },
    }

    return {
      inject: ['slots', 'remote', 'remote.settings'],
      apply(ctx) {
        function ChatModeBillionTools() {
          const [state, setState] = React.useState({
            status: 'loading',
            enabled: false,
            revision: 0,
            error: undefined,
          })

          React.useEffect(() => {
            let alive = true

            const read = async () => {
              try {
                const response = await ctx.remote.settings.describe()
                if (!response.ok) throw new Error(response.error?.message ?? '读取设置失败')
                const namespace = response.value.namespaces.find((row) => row.ns === NS)
                if (!namespace) throw new Error(`没有找到 ${NS} 设置项，请重启 DSH 后再试`)
                if (!alive) return
                setState({
                  status: 'ready',
                  enabled: namespace.value?.billionTools === true,
                  revision: namespace.revision,
                  error: undefined,
                })
              } catch (error) {
                if (!alive) return
                setState((current) => ({
                  ...current,
                  status: 'ready',
                  error: error instanceof Error ? error.message : String(error),
                }))
              }
            }

            void read()
            return () => { alive = false }
          }, [])

          const toggle = async (next) => {
            setState((current) => ({ ...current, status: 'saving', error: undefined }))
            try {
              const response = await ctx.remote.settings.mutate(
                NS,
                [{ op: 'set', path: ['billionTools'], value: next }],
                state.revision,
              )
              if (!response.ok) throw new Error(response.error?.message ?? '保存设置失败')
              setState({
                status: 'ready',
                enabled: response.value.value?.billionTools === true,
                revision: response.value.revision,
                error: undefined,
              })
            } catch (error) {
              setState((current) => ({
                ...current,
                status: 'ready',
                error: error instanceof Error ? error.message : String(error),
              }))
            }
          }

          const busy = state.status !== 'ready'

          return h(
            'div',
            { style: styles.row },
            h(
              'div',
              { style: styles.copy },
              h('label', { htmlFor: 'chat-mode-billion-tools', style: styles.label }, LABEL),
              h('div', { style: styles.desc }, DESC),
              state.error ? h('div', { style: styles.error, role: 'alert' }, state.error) : null,
            ),
            h('input', {
              id: 'chat-mode-billion-tools',
              type: 'checkbox',
              checked: state.enabled,
              disabled: busy,
              'aria-label': LABEL,
              onChange: (event) => { void toggle(event.target.checked) },
              style: styles.checkbox,
            }),
          )
        }

        ctx.slots.inject('settings.general.item', () => ctx.slots.register({
          name: 'settings.general.item',
          id: 'chat-mode-billion-tools',
          order: 50,
        }, ChatModeBillionTools))
      },
    }
  },
})
