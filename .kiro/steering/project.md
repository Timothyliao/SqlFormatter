# SQL Formatter — 项目概览

## 项目定位

纯前端 SQL 格式化工具，零服务器依赖，SQL 数据不离开浏览器。基于 Vite + TypeScript 构建，无 UI 框架。

当前版本：**v2.0.0**

---

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Vite | 4.5.3 | 构建工具 |
| TypeScript | 5.4.5 | 语言 |
| Vue 3 | 3.4.21 | UI 框架，Composition API + script setup |
| Pinia | 2.1.7 | 状态管理 |
| @vueuse/core | 10.9.0 | watchDebounced、useLocalStorage、useEventListener |
| CodeMirror 6 | latest | 左侧 SQL 编辑器 |
| sql-formatter | 15.4.2 | SQL 格式化核心库 |
| highlight.js | 11.9.0 | 右侧语法高亮 |
| Vitest | 0.34.6 | 单元测试 |

---

## 目录结构

```
src/
  main.ts                        # createApp + Pinia 挂载
  App.vue                        # 根组件，整体布局骨架，全局快捷键，markDirty/autoSave
  env.d.ts                       # Vue SFC 类型声明
  stores/
    formatterStore.ts            # SQL 内容、格式化输出、pipeline 逻辑
    historyStore.ts              # 文档 tab 管理、localStorage 持久化
    themeStore.ts                # 主题状态、localStorage 持久化
    uiStore.ts                   # 字体大小、面板宽度比例
  composables/
    useEvoWidget.ts              # EvolutionWidget 拖拽吸附逻辑
  components/
    ConfigPanel.vue              # 方言选择 + 设置弹窗
    InputPanel.vue               # CodeMirror 6 编辑器封装
    PreviewPanel.vue             # 折叠/行号/高亮展示
    HistoryPanel.vue             # 文档 tab 管理 UI
    ThemeToggle.vue              # 主题切换开关
    CopyButton.vue               # 复制按钮
    SaveButton.vue               # 保存按钮
    ResizableDivider.vue         # 拖拽分隔线
    fun/
      EvolutionWidget.vue        # 进化论小部件
      EggBook.vue                # 彩蛋图鉴弹窗
  utils/
    previewParser.ts             # 纯函数：parseBlocks/buildGutterRows/buildCodeHtml
    sqlCap.ts                    # capSql 字节截断纯函数
  formatter/
    Formatter.ts                 # 直接复用，零改动
  highlighter/
    Highlighter.ts               # 直接复用，零改动
  fun/
    EasterEgg.ts                 # 直接复用，提取 IEvolutionWidget 接口
    FunMode.ts                   # 直接复用
    SqlComplexity.ts             # 直接复用
    EvolutionWidget.ts           # 保留（实现 IEvolutionWidget 接口）
  types/
    index.ts                     # 直接复用，零改动
  styles/
    main.css                     # 直接复用，CSS 变量机制不变
    highlight-theme.css          # 直接复用
index.html                       # 简化为单 <div id="app">
tests/
  formatter.test.ts              # 直接复用
  highlighter.test.ts            # 直接复用
  previewParser.test.ts          # 纯函数测试（替代 preview-panel.test.ts）
  formatterStore.test.ts         # formatterStore pipeline 测试
  historyStore.test.ts           # historyStore 文档管理测试
  integration.test.ts            # 集成测试（使用 previewParser 纯函数）
docs/
  product.md                     # 产品文档
  dev-log.md                     # 开发记录
```

---

## 数据流

```
用户输入 SQL
  → InputPanel.vue（EditorView.updateListener → formatterStore.sql）
  → watchDebounced([sql, config], 250ms) in formatterStore
  → Formatter.format()  →  FormatResult
  → Highlighter.highlight()  →  HTML string
  → formatterStore.outputHtml
  → PreviewPanel.vue（computed parseBlocks + v-html 渲染）
  → App.vue watchDebounced(sql, 250ms) → historyStore.markDirty()
  → App.vue watchDebounced(sql, 1000ms) → historyStore.saveActiveDoc()
```

---

## 关键设计约定

- **单向数据流**：Vue 组件只负责渲染和事件，Pinia store 负责所有状态协调
- **Store 单向依赖**：formatterStore 不依赖 historyStore，markDirty/autoSave 在 App.vue 的 watchDebounced 中触发
- **historyStore.switchTo 返回 sql**：调用方（HistoryPanel.vue）负责将返回的 sql 写入 formatterStore，并设置 isRestoringFromHistory 标志
- **CSS 变量双主题**：所有颜色通过 `--color-*` 变量定义，`[data-theme='dark']` / `[data-theme='light']` 切换
- **CodeMirror 主题热替换**：使用 `Compartment` 动态替换主题扩展，不重建编辑器实例
- **isRestoringFromHistory 标志位**：在 HistoryPanel.vue 的 handleTabClick/handleNewDocument/handleDeleteDoc 中设置，用 setTimeout(0) 在下一个 tick 清除
- **字体大小**：通过 CSS 自定义属性 `--editor-font-size` 传递，uiStore 的 watch 负责写入
- **新增 Vue 组件**：在 `src/components/` 下创建 `.vue` 文件，在 `App.vue` 中 import 并使用
- **新增 Store**：在 `src/stores/` 下创建，遵循 Pinia setup store 风格（函数式）

---

## 常用命令

```bash
npm run dev      # 启动开发服务器
npm run build    # 生产构建（输出到 dist/）
npm run test     # 运行测试（watch 模式）
npm run test -- --run   # 单次运行测试
```

---

## 已知限制

- 历史记录仅保存在内存，刷新后清空
- 超过 50,000 字符的 SQL 无 Web Worker 优化
- 仅支持 PostgreSQL / MySQL / SQLite 三种方言
- 逗号位置（行首）由后处理实现，非 sql-formatter 原生支持
