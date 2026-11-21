# 聊天模式 · Chat Mode

给 [DeepSeek Harness](https://github.com/deepseek-ai) 增加一个「聊天模式」Agent 预设：**不挂载任何工具**，模型只能回文字；同时用一个小插件把宿主全局注册的工具也隐藏掉，只保留 billion-context 的上下文压缩工具。系统提示词只保留一段极短文本，尽量降低 token 消耗。

## 它做了什么

预设 `chat` 只挂载两行：

1. `@local/dsh-chat-mode/no-tools`：在预设作用域内调用 `ctx.tools.restrict({ deny })`，把当前所有全局工具（shell、文件读写、IM、Blender 等）从该 Agent 的工具定义里移除；只允许 billion-context 的工具通过：
   - `acp_*`（如 `acp_status`、`acp_cache`、`acp_read_original_image`）
   - `compress`、`decompress`、`search_context`

   如果机器上没装 billion-context，这些名字根本不存在，于是所有工具都会被隐藏，效果就是纯聊天模式。
2. `@deepseek-ai/dsh-persona`：唯一的系统提示词，`complete: true` 让这段 prefix 成为完整系统提示词，压掉默认身份、工具说明、技能目录等段落；`includeRuntimeContext: false` 不再附加可选的运行时上下文快照。

筛选插件监听 `tools/change`，因此运行期后注册的工具也会被隐藏；它不会因为自己的 `restrict()` 再次触发事件而重复提交。

## 安装

```bash
git clone <this-repo> dsh-chat-mode
```

在 DeepSeek Harness 插件管理器里选择这个本地目录安装（或调用 `plugin_manager install_bundle`，目标为绝对路径）。本地目录会以 `link:` 依赖接入，**安装后需要重启一次 DeepSeek Harness**，预设才会出现在模式选择器。之后**先选择「聊天模式」，再新建会话**；模式切换只对下一个新会话生效，不会改写已经打开的会话。

## 验证

1. 模式列表出现「聊天模式」。
2. 新会话里模型没有文件读写、shell、网络等工具；只有 billion-context 的压缩工具（若已安装）。
3. 请求中的工具定义只剩上述允许项；系统提示词只保留 prefix（外加宿主强制注入的最小上下文，例如工作目录）。

## 注意

- 该预设改变的是 Agent 的插件组成与工具可见性，**不是安全沙箱**；它管的是「模型有没有工具」，不限制 Harness 本身的文件权限。
- 已有会话保留创建时的插件组成；切换到聊天模式请新建会话。
- 没有挂载压缩插件；超长对话按宿主默认策略处理，不会自动摘要。
- 允许名单是代码里的常量（`lib/no-tools.js` 的 `ALLOWED_EXACT` / `acp_*` 前缀）。要放行别的工具，修改后重启即可。

## 开发

```bash
node --test --test-isolation=none test/no-tools.test.mjs
```

## License

MIT
