# 聊天模式 · Chat Mode

给 [DeepSeek Harness](https://github.com/deepseek-ai) 增加一个「聊天模式」Agent 预设：**默认不挂载任何工具**，模型只能回文字；同时用一个小插件把宿主全局注册的工具也隐藏掉。系统提示词只保留一段极短文本，尽量降低 token 消耗。

billion-context 的上下文压缩工具是否放行，由**设置里的一个开关**决定：短对话关掉更省 token，长对话打开可用压缩。

## 它做了什么

预设 `chat` 内部只挂载两行（设置开关本身是另一个全局插件行）：

1. `@local/dsh-chat-mode/no-tools`：在预设作用域内调用 `ctx.tools.restrict({ deny })`，把当前所有全局工具（shell、文件读写、IM、Blender 等）从该 Agent 的工具定义里移除。
   - 开关**关闭**（默认）：所有工具都隐藏，包括 billion-context。
   - 开关**打开**：只放行 billion-context 的压缩/上下文工具：
     - `acp_*`（如 `acp_status`、`acp_cache`、`acp_read_original_image`）
     - `compress`、`decompress`、`search_context`

   如果机器上没装 billion-context，这些名字根本不存在，因此即使开关打开也仍然是纯聊天模式。
2. `@deepseek-ai/dsh-persona`：唯一的系统提示词，`complete: true` 让这段 prefix 成为完整系统提示词，压掉默认身份、工具说明、技能目录等段落；`includeRuntimeContext: false` 不再附加可选的运行时上下文快照。

筛选插件监听 `tools/change`，因此运行期后注册的工具也会被隐藏。`ctx.tools.restrict()` 返回的 disposer 会先撤销旧限制，再按当前开关应用新限制，所以切换开关不需要重启，也不会叠加两层限制。

## 设置开关

打开 **设置 → 通用（General）**，找到：

> **聊天模式：启用 billion-context 工具**
> 关闭时 chat 模式不加载压缩/上下文工具，短对话更省 token；开启后长对话可用压缩节省上下文。

开关写入 profile 的 Cordis patch（`chat-mode-settings` 行），重启后仍保留；对已经打开的聊天模式会话也会即时生效。

## 安装

```bash
git clone https://github.com/hemuandy/dsh-chat-mode.git
```

在 DeepSeek Harness 插件管理器里选择这个本地目录安装（或调用 `plugin_manager install_bundle`，目标为绝对路径）。本地目录会以 `link:` 依赖接入，**安装后需要重启一次 DeepSeek Harness**，预设和设置行才会加载。之后**先选择「聊天模式」，再新建会话**；模式切换只对下一个新会话生效，不会改写已经打开的会话。

安装依赖后，插件目录里会有 `node_modules/`（由 `@deepseek-ai/schemastery` 提供 Config 的 volatile 标记）。本地克隆请先在插件目录执行 `pnpm install`；从 GitHub 安装时包管理器会处理 `dependencies`。

## 验证

1. 模式列表出现「聊天模式」。
2. **设置 → 通用** 出现「聊天模式：启用 billion-context 工具」。
3. 开关关闭时，新会话没有文件读写、shell、网络等工具；开关打开且装了 billion-context 时，只多出压缩类工具。
4. 系统提示词只保留 prefix（外加宿主强制注入的最小上下文，例如工作目录）。

## 注意

- 该预设改变的是 Agent 的插件组成与工具可见性，**不是安全沙箱**；它管的是「模型有没有工具」，不限制 Harness 本身的文件权限。
- 已有会话保留创建时的插件组成；切换到聊天模式请新建会话。
- 开关默认关闭：短对话不必为压缩工具和压缩指令付出 token；对话变长后再打开压缩更划算。
- 允许名单是代码里的常量（`lib/no-tools.js` 的 `ALLOWED_EXACT` / `acp_*` 前缀）。要放行别的工具，修改后重启即可。

## 开发

```bash
node --test --test-isolation=none
```

测试覆盖默认关闭、打开、即时切换、晚注册工具、无工具、billion-context 缺失，以及 Config 的 volatile 元数据。

## License

MIT
