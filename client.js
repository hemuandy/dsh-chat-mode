/**
 * Chat-mode settings page.
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
    const DEFAULT_PROMPT = "You are a helpful, concise assistant. Reply in the user's language."

    /** Host remote face, captured in apply(); the page component runs later. */
    let remote

    const styles = {
      page: {
        maxWidth: '720px',
        padding: '24px 28px 40px',
        color: 'var(--dsh-text-primary, inherit)',
      },
      intro: {
        margin: '0 0 24px',
        fontSize: '13px',
        lineHeight: 1.65,
        color: 'var(--dsh-text-secondary, #888)',
      },
      section: {
        padding: '18px 0',
        borderTop: '1px solid var(--dsh-border, rgba(128,128,128,.22))',
      },
      sectionTitle: {
        margin: '0 0 6px',
        fontSize: '14px',
        fontWeight: 600,
        lineHeight: 1.5,
      },
      hint: {
        margin: '0 0 12px',
        fontSize: '12px',
        lineHeight: 1.6,
        color: 'var(--dsh-text-secondary, #888)',
      },
      toggleRow: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
      },
      checkbox: {
        flex: '0 0 auto',
        width: '16px',
        height: '16px',
        marginTop: '3px',
        accentColor: 'var(--dsh-accent, #4d6bfe)',
        cursor: 'pointer',
      },
      toggleCopy: { minWidth: 0, flex: '1 1 auto' },
      toggleLabel: {
        display: 'block',
        fontSize: '13px',
        fontWeight: 600,
        lineHeight: 1.5,
        cursor: 'pointer',
      },
      textarea: {
        display: 'block',
        width: '100%',
        minHeight: '180px',
        boxSizing: 'border-box',
        padding: '10px 12px',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
        fontSize: '12.5px',
        lineHeight: 1.65,
        color: 'var(--dsh-text-primary, inherit)',
        background: 'var(--dsh-bg-secondary, rgba(128,128,128,.08))',
        border: '1px solid var(--dsh-border, rgba(128,128,128,.35))',
        borderRadius: '8px',
        resize: 'vertical',
      },
      footer: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        paddingTop: '18px',
        borderTop: '1px solid var(--dsh-border, rgba(128,128,128,.22))',
      },
      primaryButton: {
        padding: '6px 16px',
        fontSize: '13px',
        lineHeight: 1.5,
        color: '#fff',
        background: 'var(--dsh-accent, #4d6bfe)',
        border: '1px solid transparent',
        borderRadius: '6px',
        cursor: 'pointer',
      },
      secondaryButton: {
        padding: '6px 12px',
        fontSize: '13px',
        lineHeight: 1.5,
        color: 'var(--dsh-text-primary, inherit)',
        background: 'transparent',
        border: '1px solid var(--dsh-border, rgba(128,128,128,.35))',
        borderRadius: '6px',
        cursor: 'pointer',
      },
      status: {
        marginLeft: 'auto',
        fontSize: '12px',
        lineHeight: 1.5,
        color: 'var(--dsh-text-secondary, #888)',
      },
      error: {
        marginTop: '12px',
        fontSize: '12px',
        lineHeight: 1.5,
        color: 'var(--dsh-danger, #d33)',
      },
      disabled: { opacity: 0.55, cursor: 'default' },
    }

    function ChatModeSettings() {
      const [state, setState] = React.useState({
        status: 'loading',
        billionTools: false,
        savedBillionTools: false,
        prompt: DEFAULT_PROMPT,
        savedPrompt: DEFAULT_PROMPT,
        revision: 0,
        error: undefined,
        saved: false,
      })

      React.useEffect(() => {
        let alive = true

        const read = async () => {
          try {
            const response = await remote.settings.describe()
            if (!response.ok) throw new Error(response.error?.message ?? '读取设置失败')
            const namespace = response.value.namespaces.find((row) => row.ns === NS)
            if (!namespace) throw new Error(`没有找到 ${NS} 设置项，请重启 DSH 后再试`)
            if (!alive) return
            const value = namespace.value ?? {}
            const prompt = typeof value.prompt === 'string' ? value.prompt : DEFAULT_PROMPT
            const billionTools = value.billionTools === true
            setState({
              status: 'ready',
              billionTools,
              savedBillionTools: billionTools,
              prompt,
              savedPrompt: prompt,
              revision: namespace.revision,
              error: undefined,
              saved: false,
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

      const dirty = state.prompt !== state.savedPrompt || state.billionTools !== state.savedBillionTools
      const busy = state.status !== 'ready'

      const save = async () => {
        setState((current) => ({ ...current, status: 'saving', error: undefined, saved: false }))
        try {
          const response = await remote.settings.mutate(
            NS,
            [
              { op: 'set', path: ['billionTools'], value: state.billionTools },
              { op: 'set', path: ['prompt'], value: state.prompt },
            ],
            state.revision,
          )
          if (!response.ok) throw new Error(response.error?.message ?? '保存设置失败')
          const value = response.value.value ?? {}
          const prompt = typeof value.prompt === 'string' ? value.prompt : state.prompt
          const billionTools = value.billionTools === true
          setState({
            status: 'ready',
            billionTools,
            savedBillionTools: billionTools,
            prompt,
            savedPrompt: prompt,
            revision: response.value.revision,
            error: undefined,
            saved: true,
          })
        } catch (error) {
          setState((current) => ({
            ...current,
            status: 'ready',
            error: error instanceof Error ? error.message : String(error),
          }))
        }
      }

      const resetPrompt = () => {
        setState((current) => ({ ...current, prompt: DEFAULT_PROMPT, saved: false }))
      }

      if (busy && state.status === 'loading') {
        return h('div', { style: styles.page }, h('p', { style: styles.hint }, '正在读取设置…'))
      }

      return h(
        'div',
        { style: styles.page },
        h(
          'p',
          { style: styles.intro },
          '这些设置只影响「聊天模式」预设。工具开关即时生效；系统提示词在下一轮对话生效，不需要重启。',
        ),
        h(
          'div',
          { style: styles.section },
          h('h3', { style: styles.sectionTitle }, 'billion-context 工具'),
          h(
            'p',
            { style: styles.hint },
            '关闭时聊天模式不加载任何工具，短对话更省 token；打开后只允许压缩/上下文工具，适合长对话。',
          ),
          h(
            'div',
            { style: styles.toggleRow },
            h('input', {
              id: 'chat-mode-billion-tools',
              type: 'checkbox',
              checked: state.billionTools,
              disabled: busy,
              onChange: (event) => setState((current) => ({
                ...current,
                billionTools: event.target.checked,
                saved: false,
              })),
              style: styles.checkbox,
            }),
            h(
              'div',
              { style: styles.toggleCopy },
              h(
                'label',
                { htmlFor: 'chat-mode-billion-tools', style: styles.toggleLabel },
                '启用 billion-context 工具',
              ),
              h(
                'div',
                { style: styles.hint },
                '允许 acp_*、compress、decompress、search_context；未安装 billion-context 时无效果。',
              ),
            ),
          ),
        ),
        h(
          'div',
          { style: styles.section },
          h('h3', { style: styles.sectionTitle }, '系统提示词'),
          h(
            'p',
            { style: styles.hint },
            '这是聊天模式唯一的系统提示词（complete 段落）。留空表示不发送任何自定义提示词；宿主仍可能注入最小必需上下文。',
          ),
          h('textarea', {
            value: state.prompt,
            disabled: busy,
            rows: 8,
            spellCheck: false,
            onChange: (event) => setState((current) => ({
              ...current,
              prompt: event.target.value,
              saved: false,
            })),
            style: styles.textarea,
          }),
        ),
        state.error ? h('div', { style: styles.error, role: 'alert' }, state.error) : null,
        h(
          'div',
          { style: styles.footer },
          h(
            'button',
            {
              type: 'button',
              disabled: busy || !dirty,
              onClick: () => { void save() },
              style: { ...styles.primaryButton, ...(busy || !dirty ? styles.disabled : {}) },
            },
            state.status === 'saving' ? '保存中…' : '保存',
          ),
          h(
            'button',
            {
              type: 'button',
              disabled: busy,
              onClick: resetPrompt,
              style: { ...styles.secondaryButton, ...(busy ? styles.disabled : {}) },
            },
            '恢复默认提示词',
          ),
          h(
            'span',
            { style: styles.status },
            state.status === 'saving' ? '保存中…' : state.saved && !dirty ? '已保存' : dirty ? '有未保存的修改' : '',
          ),
        ),
      )
    }

    return {
      inject: ['slots', 'remote', 'remote.settings'],
      apply(ctx) {
        remote = ctx.remote
        ctx.slots.inject('settings.section', () => ctx.slots.register({
          name: 'settings.section',
          id: 'chat-mode',
          order: 30,
          label: '聊天模式',
        }, ChatModeSettings))
        ctx.slots.inject('settings.section.icon', () => ctx.slots.register({
          name: 'settings.section.icon',
          id: 'chat-mode',
          label: '聊天模式',
        }, function ChatModeIcon() {
          return h(
            'svg',
            {
              width: 16,
              height: 16,
              viewBox: '0 0 24 24',
              fill: 'none',
              stroke: 'currentColor',
              strokeWidth: 1.8,
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
              'aria-hidden': true,
            },
            h('path', { d: 'M21 12a8 8 0 0 1-8 8H6l-3 2V12a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8Z' }),
          )
        }))
      },
    }
  },
})
