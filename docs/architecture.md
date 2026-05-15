# SQL Formatter 技术架构文档

> 版本：v2.0.0 | 最后更新：2026-05-15

---

## 1. 项目概述

SQL Formatter 是一款**纯前端** SQL 格式化工具，基于 Vue 3 + Pinia + CodeMirror 6 构建。所有 SQL 数据仅在浏览器本地处理，零服务器依赖，保障数据隐私。

### 核心特性

- 实时格式化预览（250ms 防抖）
- 多文档 Tab 管理（最多 5 个，localStorage 持久化）
- 代码折叠（按 SQL 语句块折叠/展开）
- 深色/浅色双主题热切换
- 可拖拽面板分隔线
- 趣味系统：SQL 复杂度进化论 + 彩蛋

---

## 2. 技术栈

| 层级 | 技术 | 版本 | 职责 |
|------|------|------|------|
| 构建 | Vite | 4.5.3 | 开发服务器 + 生产构建 |
| 语言 | TypeScript | 5.4.5 | 严格模式，零 `any` |
| UI 框架 | Vue 3 | 3.4.21 | Composition API + `<script setup>` |
| 状态管理 | Pinia | 2.1.7 | Setup Store 风格 |
| 工具库 | @vueuse/core | 10.9.0 | watchDebounced / useLocalStorage / useEventListener |
| 编辑器 | CodeMirror 6 | latest | 左侧 SQL 输入 |
| 格式化 | sql-formatter | 15.4.2 | SQL 格式化核心引擎 |
| 高亮 | highlight.js | 11.9.0 | 右侧预览语法高亮 |
| 测试 | Vitest | 0.34.6 | 单元测试 + 集成测试 |

---

## 3. 整体架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Browser (SPA)                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────── Vue App ──────────────────────────────┐     │
│  │                                                            │     │
│  │  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐  │     │
│  │  │  App.vue │  │ConfigPanel│  │ThemeToggle│  │HistoryPanel│ │     │
│  │  │ (Root)  │  │          │  │          │  │           │  │     │
│  │  └────┬────┘  └─────┬────┘  └─────┬────┘  └─────┬─────┘  │     │
│  │       │              │             │             │         │     │
│  │  ┌────┴──────────────┴─────────────┴─────────────┴────┐    │     │
│  │  │              Pinia Stores (状态层)                   │    │     │
│  │  │  ┌──────────────┐ ┌────────────┐ ┌──────────────┐  │    │     │
│  │  │  │formatterStore│ │historyStore│ │  themeStore  │  │    │     │
│  │  │  │  + uiStore   │ │            │ │              │  │    │     │
│  │  │  └──────┬───────┘ └────────────┘ └──────────────┘  │    │     │
│  │  └─────────┼──────────────────────────────────────────┘    │     │
│  │            │                                               │     │
│  │  ┌────────┴────────────────────────────────────────┐       │     │
│  │  │           Core Modules (纯逻辑层)                │       │     │
│  │  │  ┌──────────┐  ┌───────────┐  ┌─────────────┐  │       │     │
│  │  │  │ Formatter│  │Highlighter│  │previewParser│  │       │     │
│  │  │  └──────────┘  └───────────┘  └─────────────┘  │       │     │
│  │  └─────────────────────────────────────────────────┘       │     │
│  │                                                            │     │
│  │  ┌──────────────── Fun System ─────────────────────┐       │     │
│  │  │  FunMode │ SqlComplexity │ EasterEgg            │       │     │
│  │  │  EvolutionWidget.vue │ EggBook.vue              │       │     │
│  │  └────────────────────────────────────────────────┘       │     │
│  └────────────────────────────────────────────────────────────┘     │
│                                                                     │
│  ┌─────────────────── localStorage ───────────────────────────┐     │
│  │  documents │ active-doc │ config │ theme │ font-size │ pos │     │
│  └────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. 目录结构

```
src/
├── main.ts                    # 应用入口：createApp + Pinia
├── App.vue                    # 根组件：布局骨架 + 全局快捷键 + watchDebounced
├── stores/
│   ├── formatterStore.ts      # SQL 内容 + 格式化 pipeline
│   ├── historyStore.ts        # 多文档 Tab 管理 + localStorage
│   ├── themeStore.ts          # 主题状态 + data-theme 属性
│   └── uiStore.ts             # 字体大小 + 面板宽度比例
├── components/
│   ├── ConfigPanel.vue        # 方言选择 + 设置弹窗
│   ├── InputPanel.vue         # CodeMirror 6 编辑器
│   ├── PreviewPanel.vue       # 格式化结果展示（折叠/行号/高亮）
│   ├── HistoryPanel.vue       # 文档 Tab 栏
│   ├── ThemeToggle.vue        # 主题切换开关
│   ├── CopyButton.vue         # 复制按钮
│   ├── SaveButton.vue         # 保存状态指示
│   ├── ResizableDivider.vue   # 可拖拽分隔线
│   └── fun/
│       ├── EvolutionWidget.vue # 进化论浮动小部件
│       └── EggBook.vue         # 彩蛋图鉴弹窗
├── composables/
│   └── useEvoWidget.ts        # 拖拽吸附逻辑
├── formatter/
│   └── Formatter.ts           # SQL 格式化 + 后处理
├── highlighter/
│   └── Highlighter.ts         # highlight.js 封装
├── utils/
│   ├── previewParser.ts       # 纯函数：块解析/行号/折叠
│   └── sqlCap.ts              # SQL 字节截断
├── fun/
│   ├── FunMode.ts             # 趣味模式开关
│   ├── SqlComplexity.ts       # SQL 复杂度评分
│   └── EasterEgg.ts           # 彩蛋检测与触发
├── types/
│   └── index.ts               # 类型定义 + 常量
└── styles/
    ├── main.css               # 全局样式 + CSS 变量
    └── highlight-theme.css    # 语法高亮颜色
```

---

## 5. 核心数据流

这是本项目最关键的架构设计——**单向数据流**。


### 5.1 格式化 Pipeline

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        格式化数据流 (Formatting Pipeline)                  │
└──────────────────────────────────────────────────────────────────────────┘

  用户键入 SQL
       │
       ▼
  ┌─────────────────┐    EditorView.updateListener
  │  InputPanel.vue  │ ─────────────────────────────┐
  │  (CodeMirror 6)  │                              │
  └─────────────────┘                              ▼
                                          formatterStore.sql (ref)
                                                   │
                                    watchDebounced([sql, config], 250ms)
                                                   │
                                                   ▼
                                    ┌──────────────────────────┐
                                    │    Formatter.format()     │
                                    │  ┌────────────────────┐  │
                                    │  │ 1. sql-formatter    │  │
                                    │  │ 2. postProcess语句  │  │
                                    │  │ 3. postProcess逗号  │  │
                                    │  │ 4. postProcess IN   │  │
                                    │  └────────────────────┘  │
                                    └────────────┬─────────────┘
                                                 │
                                                 ▼ FormatResult { text, error? }
                                    ┌──────────────────────────┐
                                    │  Highlighter.highlight()  │
                                    │  (highlight.js → HTML)    │
                                    └────────────┬─────────────┘
                                                 │
                                                 ▼
                                    formatterStore.outputHtml (ref)
                                                 │
                                                 ▼
                                    ┌──────────────────────────┐
                                    │   PreviewPanel.vue        │
                                    │  ┌────────────────────┐  │
                                    │  │ parseBlocks()       │  │
                                    │  │ buildGutterRows()   │  │
                                    │  │ buildCodeHtml()     │  │
                                    │  └────────────────────┘  │
                                    └──────────────────────────┘
```

### 5.2 自动保存流

```
  formatterStore.sql 变化
       │
       ├── watchDebounced(250ms) ──→ historyStore.markDirty()
       │                              （标记当前文档有未保存修改）
       │
       └── watchDebounced(1000ms) ─→ historyStore.saveActiveDoc(sql)
                                      （写入 localStorage）
```

> **关键标志位**：`isRestoringFromHistory = true` 时，上述两个 watcher 均跳过，避免从历史恢复时产生脏标记或循环保存。

### 5.3 文档切换流

```
  用户点击 Tab
       │
       ▼
  HistoryPanel.handleTabClick(id)
       │
       ├── historyStore.switchTo(id, flushFn)
       │     ├── flushFn() → 保存当前文档
       │     ├── 切换 activeId
       │     └── 返回新文档的 sql
       │
       ▼
  formatterStore.isRestoringFromHistory = true
  formatterStore.sql = newSql
  setTimeout(0) → isRestoringFromHistory = false
       │
       ▼
  InputPanel watch(formatterStore.sql) → 同步到 EditorView
  formatterStore watchDebounced → 重新格式化
```

---

## 6. 状态管理架构

项目使用 **Pinia Setup Store** 风格，4 个 Store 各司其职：

```
┌─────────────────────────────────────────────────────────────┐
│                    Pinia Store 依赖关系                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐         ┌──────────────┐                 │
│  │formatterStore│         │ historyStore  │                 │
│  │              │         │              │                 │
│  │ • sql        │         │ • docs[]     │                 │
│  │ • config     │◄────────│ • activeId   │                 │
│  │ • outputHtml │  App.vue│ • dirtyId    │                 │
│  │ • errorMsg   │  协调   │ • saveStatus │                 │
│  │ • isRestoring│         │              │                 │
│  └──────────────┘         └──────────────┘                 │
│         ▲                                                   │
│         │ 读取 config                                       │
│  ┌──────┴───────┐         ┌──────────────┐                 │
│  │   uiStore    │         │  themeStore   │                 │
│  │              │         │              │                 │
│  │ • fontSize   │         │ • theme      │                 │
│  │ • leftPanelPct│        │ (dark/light) │                 │
│  └──────────────┘         └──────────────┘                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**设计原则**：
- `formatterStore` 不依赖 `historyStore`，二者通过 `App.vue` 的 watchDebounced 协调
- Store 之间无循环依赖
- 组件只负责渲染和事件分发，业务逻辑在 Store 中

---

## 7. 组件架构

### 7.1 组件树

```
App.vue
├── <header>
│   ├── ConfigPanel.vue          ← 方言选择 + 设置弹窗(Teleport)
│   └── ThemeToggle.vue          ← 深色/浅色切换
├── <history-bar>
│   └── HistoryPanel.vue         ← 文档 Tab 列表
├── <main> (flex 布局)
│   ├── <section.panel-input>
│   │   ├── SaveButton.vue       ← 保存状态指示
│   │   └── InputPanel.vue       ← CodeMirror 6 编辑器
│   ├── ResizableDivider.vue     ← 可拖拽分隔线
│   └── <section.panel-preview>
│       ├── CopyButton.vue       ← 复制格式化结果
│       └── PreviewPanel.vue     ← 格式化结果展示
├── EvolutionWidget.vue          ← 浮动进化论小部件
└── EggBook.vue                  ← 彩蛋图鉴弹窗
```

### 7.2 组件通信模式

```
┌─────────────────────────────────────────────────────────┐
│                   组件通信方式                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Props/Events:  父 → 子 单向传递                         │
│  ────────────                                           │
│  App.vue → CopyButton (:get-plain-text)                 │
│  App.vue → PreviewPanel (ref → expose: foldAll/unfoldAll)│
│                                                         │
│  Pinia Store:  跨组件共享状态                            │
│  ──────────                                             │
│  InputPanel ←→ formatterStore ←→ PreviewPanel           │
│  HistoryPanel ←→ historyStore                           │
│  ConfigPanel ←→ formatterStore.config + uiStore         │
│  ThemeToggle ←→ themeStore                              │
│  ResizableDivider ←→ uiStore.leftPanelPct              │
│                                                         │
│  Custom Events (DOM):  解耦的跨组件通知                   │
│  ──────────────────                                     │
│  EasterEgg → 'egg-discovered' → EggBook                 │
│  EvolutionWidget → 'open-egg-book' → EggBook            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 8. 格式化引擎详解

`Formatter.ts` 是格式化的核心，采用 **管道式后处理** 架构：

```
┌─────────────────────────────────────────────────────────────┐
│                  Formatter Pipeline                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  输入: raw SQL string + FormatterConfig                     │
│       │                                                     │
│       ▼                                                     │
│  ┌─────────────────────────────────────┐                    │
│  │ Step 1: sql-formatter.format()      │                    │
│  │   • dialect (postgresql/mysql/sqlite)│                    │
│  │   • tabWidth (2/4)                  │                    │
│  │   • keywordCase (upper/lower/preserve)│                  │
│  │   • expressionWidth: 9999 (不换行)   │                    │
│  └──────────────────┬──────────────────┘                    │
│                     ▼                                       │
│  ┌─────────────────────────────────────┐                    │
│  │ Step 2: postProcessStatements()     │                    │
│  │   • 多语句间插入 N 个空行            │                    │
│  │   • 去除尾部空行                     │                    │
│  └──────────────────┬──────────────────┘                    │
│                     ▼                                       │
│  ┌─────────────────────────────────────┐                    │
│  │ Step 3: postProcessCommaPosition()  │                    │
│  │   • 'after': 不处理（默认行尾逗号）   │                    │
│  │   • 'before': 正则移动逗号到行首      │                    │
│  └──────────────────┬──────────────────┘                    │
│                     ▼                                       │
│  ┌─────────────────────────────────────┐                    │
│  │ Step 4: postProcessInClauses()      │                    │
│  │   • 按 valuesPerLine 分组 IN 值     │                    │
│  │   • 少于阈值则保持单行               │                    │
│  └──────────────────┬──────────────────┘                    │
│                     ▼                                       │
│  输出: FormatResult { text, error? }                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**容错设计**：`format()` 永不抛异常，出错时返回原始 SQL + error 消息。

---

## 9. 预览渲染引擎

`previewParser.ts` 提供纯函数，将高亮 HTML 解析为可折叠的语句块：

```
┌─────────────────────────────────────────────────────────────┐
│              Preview Rendering Pipeline                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  formatterStore.outputHtml (highlight.js 输出)              │
│       │                                                     │
│       ▼                                                     │
│  parseBlocks(html) → StatementBlock[]                       │
│  ┌─────────────────────────────────────┐                    │
│  │ Phase 1: 按空行分割为候选块          │                    │
│  │ Phase 2: 识别纯注释块（不可折叠）    │                    │
│  │ Phase 3: 合并 SQL 块直到遇到分号     │                    │
│  │ Phase 4: 计算 foldAnchorLine        │                    │
│  └──────────────────┬──────────────────┘                    │
│                     │                                       │
│       ┌─────────────┼─────────────┐                         │
│       ▼             ▼             ▼                         │
│  buildGutterRows  buildCodeHtml  getPlainTextFromBlocks     │
│  (行号+折叠按钮)  (折叠/展开HTML) (复制用纯文本)             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**StatementBlock 结构**：
```typescript
interface StatementBlock {
  htmlLines: string[];          // 该语句的高亮 HTML 行
  leadingCommentCount: number;  // 前导注释行数（折叠时仍显示）
  foldAnchorLine: number;       // 折叠锚点行索引
}
```

---

## 10. 主题系统

双主题通过 **CSS 变量 + data-theme 属性** 实现，无需重新渲染组件：

```
┌─────────────────────────────────────────────────────────────┐
│                    主题切换机制                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ThemeToggle.vue                                            │
│       │ click                                               │
│       ▼                                                     │
│  themeStore.theme = 'dark' | 'light'                        │
│       │                                                     │
│       ├── watch(immediate) → document.documentElement       │
│       │     .setAttribute('data-theme', theme)              │
│       │                                                     │
│       └── useLocalStorage → 持久化到 localStorage           │
│                                                             │
│  CSS 响应：                                                  │
│  ┌─────────────────────────────────────────────┐            │
│  │ :root, [data-theme='dark'] {                │            │
│  │   --color-bg: #1e1e2e;                      │            │
│  │   --color-text: #cdd6f4;                    │            │
│  │   --color-accent: #89b4fa;                  │            │
│  │   ...                                       │            │
│  │ }                                           │            │
│  │ [data-theme='light'] {                      │            │
│  │   --color-bg: #eff1f5;                      │            │
│  │   --color-text: #4c4f69;                    │            │
│  │   --color-accent: #1e66f5;                  │            │
│  │   ...                                       │            │
│  │ }                                           │            │
│  └─────────────────────────────────────────────┘            │
│                                                             │
│  CodeMirror 主题热替换：                                     │
│  InputPanel.vue watch(themeStore.theme) →                    │
│    themeCompartment.reconfigure(getThemeExtensions(theme))   │
│  （不重建 EditorView，仅替换主题扩展）                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**配色方案**：
- 深色主题：Catppuccin Mocha 色系
- 浅色主题：Catppuccin Latte 色系

---

## 11. 多文档管理


```
┌─────────────────────────────────────────────────────────────┐
│              多文档 Tab 管理架构                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────┐        │
│  │  HistoryPanel.vue (Tab 栏 UI)                   │        │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌───┐        │        │
│  │  │Doc 1│ │Doc 2│ │Doc 3│ │Doc 4│ │ + │        │        │
│  │  │ ●   │ │     │ │     │ │     │ │   │        │        │
│  │  └─────┘ └─────┘ └─────┘ └─────┘ └───┘        │        │
│  │  (● = dirty indicator)                          │        │
│  └─────────────────────────────────────────────────┘        │
│                         │                                   │
│                         ▼                                   │
│  ┌─────────────────────────────────────────────────┐        │
│  │  historyStore                                   │        │
│  │                                                 │        │
│  │  docs: SqlDocument[] (最多 5 个)                 │        │
│  │  ┌──────────────────────────────────────┐       │        │
│  │  │ { id, label, sql, updatedAt }        │       │        │
│  │  └──────────────────────────────────────┘       │        │
│  │                                                 │        │
│  │  activeId: string     ← 当前激活文档             │        │
│  │  dirtyId: string|null ← 有未保存修改的文档       │        │
│  │  saveStatus: 'idle'|'saved'|'error'             │        │
│  │                                                 │        │
│  │  方法：                                          │        │
│  │  • switchTo(id, flushFn) → 切换文档              │        │
│  │  • newDocument()         → 新建文档              │        │
│  │  • deleteDoc(id)         → 删除文档              │        │
│  │  • renameDoc(id, label)  → 重命名                │        │
│  │  • saveActiveDoc(sql)    → 保存到 localStorage   │        │
│  │  • markDirty()           → 标记脏状态            │        │
│  └─────────────────────────────────────────────────┘        │
│                         │                                   │
│                         ▼                                   │
│  ┌─────────────────────────────────────────────────┐        │
│  │  localStorage                                   │        │
│  │  • sql-formatter-documents  (SqlDocument[])     │        │
│  │  • sql-formatter-active-doc (string)            │        │
│  │  • sql-formatter-doc-counter (number)           │        │
│  └─────────────────────────────────────────────────┘        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**约束**：
- 最多 5 个文档（`MAX_DOCUMENTS`）
- 单文档最大 200KB（`MAX_SQL_BYTES`），超出自动截断
- 至少保留 1 个文档，不可全部删除
- localStorage 写入失败时自动淘汰旧文档重试

---

## 12. CodeMirror 6 集成

`InputPanel.vue` 封装了 CodeMirror 6 编辑器：

```
┌─────────────────────────────────────────────────────────────┐
│              CodeMirror 6 集成架构                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  EditorState.create({                                       │
│    doc: formatterStore.sql,                                 │
│    extensions: [                                            │
│      history(),                    ← 撤销/重做              │
│      keymap([default, history]),   ← 快捷键                 │
│      indentOnInput(),              ← 自动缩进               │
│      bracketMatching(),            ← 括号匹配               │
│      sql(),                        ← SQL 语言支持           │
│      lineNumbers(),                ← 行号                   │
│      highlightActiveLine(),        ← 当前行高亮             │
│      layoutTheme,                  ← 布局样式（字体/间距）   │
│      themeCompartment.of(...)      ← 可热替换的颜色主题     │
│      updateListener               ← 内容变化 → store       │
│    ]                                                        │
│  })                                                         │
│                                                             │
│  双向同步：                                                  │
│  ┌──────────────────────────────────────────────┐           │
│  │ 用户输入 → updateListener → formatterStore.sql│           │
│  │ 历史恢复 → watch(sql) → view.dispatch(changes)│           │
│  └──────────────────────────────────────────────┘           │
│                                                             │
│  主题热替换（无需重建编辑器）：                                │
│  watch(themeStore.theme) →                                  │
│    view.dispatch({ effects:                                 │
│      themeCompartment.reconfigure(newTheme) })              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 13. 趣味系统（Fun Mode）

项目内置了一套游戏化系统，为枯燥的 SQL 格式化增添乐趣：

### 13.1 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Fun System 架构                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐                                               │
│  │ FunMode  │ ← 全局开关（默认开启）                         │
│  └────┬─────┘                                               │
│       │ isEnabled()                                         │
│       ▼                                                     │
│  ┌─────────────────────────────────────────────────┐        │
│  │  EvolutionWidget.vue (浮动小部件)                │        │
│  │                                                 │        │
│  │  watch(formatterStore.sql) →                    │        │
│  │    ├── scoreSql(sql) → ComplexityScore          │        │
│  │    ├── getLevel(score) → EvolutionLevel         │        │
│  │    ├── 等级变化 → 显示进化动画                    │        │
│  │    └── easterEgg.check(sql) → 触发彩蛋          │        │
│  │                                                 │        │
│  │  UI 功能：                                       │        │
│  │  • 拖拽吸附四边（useEvoWidget composable）       │        │
│  │  • Tooltip 显示评分详情                          │        │
│  │  • 消息队列（terminal/toast/tagline）            │        │
│  └─────────────────────────────────────────────────┘        │
│                                                             │
│  ┌─────────────────────────────────────────────────┐        │
│  │  SqlComplexity.ts (评分引擎)                     │        │
│  │                                                 │        │
│  │  评分规则：                                      │        │
│  │  • 行数 × 1                                     │        │
│  │  • JOIN × 3                                     │        │
│  │  • UNION × 3                                    │        │
│  │  • CTE × 4                                      │        │
│  │  • 子查询 × 5                                   │        │
│  │  • 窗口函数 × 6                                  │        │
│  │                                                 │        │
│  │  进化等级：                                      │        │
│  │  Lv.1 🦠 原始汤    (0-10)                       │        │
│  │  Lv.2 🐛 虫子      (11-30)                      │        │
│  │  Lv.3 🐟 鱼        (31-60)                      │        │
│  │  Lv.4 🦎 爬行动物  (61-100)                     │        │
│  │  Lv.5 🦕 恐龙      (101-150)                    │        │
│  │  Lv.6 🧠 大脑      (151-200)                    │        │
│  │  Lv.7 👾 未知生命  (201+)                       │        │
│  └─────────────────────────────────────────────────┘        │
│                                                             │
│  ┌─────────────────────────────────────────────────┐        │
│  │  EasterEgg.ts (彩蛋系统)                         │        │
│  │                                                 │        │
│  │  检测规则（8 个彩蛋）：                           │        │
│  │  • DROP TABLE    → 核弹拦截（屏幕震动）           │        │
│  │  • DELETE无WHERE → 差点删库跑路                   │        │
│  │  • TRUNCATE      → 清空宇宙                     │        │
│  │  • SELECT *      → 全表扫描侦探                  │        │
│  │  • SELECT 1      → 宇宙答案 42                   │        │
│  │  • SELECT NULL   → 虚无哲学家                    │        │
│  │  • 仅分号        → 极简主义者                    │        │
│  │  • ≥500行        → 史诗级查询（撒花）             │        │
│  │                                                 │        │
│  │  机制：                                          │        │
│  │  • 8秒冷却时间，避免重复触发                      │        │
│  │  • 已发现彩蛋持久化到 localStorage               │        │
│  │  • 发现新彩蛋 → dispatch 'egg-discovered' 事件   │        │
│  └─────────────────────────────────────────────────┘        │
│                                                             │
│  ┌─────────────────────────────────────────────────┐        │
│  │  EggBook.vue (彩蛋图鉴)                          │        │
│  │  • 展示所有彩蛋定义                              │        │
│  │  • 已发现的高亮显示，未发现的显示 ???             │        │
│  │  • 通过 'open-egg-book' 自定义事件打开           │        │
│  └─────────────────────────────────────────────────┘        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 13.2 消息队列机制

EvolutionWidget 内部维护一个 FIFO 消息队列，确保多个消息按序播放：

```
  enqueue(item) → queue.push(item)
       │
       ▼ (如果空闲)
  processNext()
       │
       ├── type: 'terminal' → playTerminal() → 逐字打字动画
       ├── type: 'toast'    → playToast()    → 气泡提示
       └── type: 'tagline'  → playTagline()  → 进化标语
       │
       ▼ (播放完毕)
  doneAndNext() → 500ms 后处理下一条
```

---

## 14. 持久化策略

所有持久化均使用 `localStorage`，无后端依赖：

| Key | 内容 | 管理者 |
|-----|------|--------|
| `sql-formatter-documents` | SqlDocument[] | historyStore |
| `sql-formatter-active-doc` | 当前文档 ID | historyStore |
| `sql-formatter-doc-counter` | 文档计数器 | historyStore |
| `sql-formatter-config` | 格式化配置 + 字体大小 | ConfigPanel |
| `sql-formatter-theme` | 'dark' \| 'light' | themeStore |
| `sql-formatter-font-size` | number (px) | uiStore |
| `sql-formatter-evo-pos` | { edge, offset } | useEvoWidget |
| `sql-formatter-eggbook` | 已发现彩蛋 ID[] | EasterEgg |

---

## 15. 响应式布局

```
┌─────────────────────────────────────────────────────────────┐
│                    布局结构                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  桌面端 (≥768px)：                                           │
│  ┌─────────────────────────────────────────────────┐        │
│  │ Header (52px)                                   │        │
│  ├─────────────────────────────────────────────────┤        │
│  │ History Bar (36px)                              │        │
│  ├────────────────────┬──┬─────────────────────────┤        │
│  │                    │  │                         │        │
│  │   Input Panel      │分│   Preview Panel         │        │
│  │   (CodeMirror)     │隔│   (高亮+折叠)           │        │
│  │                    │线│                         │        │
│  │   flex: none       │5p│   flex: 1               │        │
│  │   width: N%        │x │                         │        │
│  │                    │  │                         │        │
│  └────────────────────┴──┴─────────────────────────┘        │
│                                                             │
│  移动端 (<768px)：                                           │
│  ┌─────────────────────────────────────────────────┐        │
│  │ Header (auto)                                   │        │
│  ├─────────────────────────────────────────────────┤        │
│  │ History Bar (auto, wrap)                        │        │
│  ├─────────────────────────────────────────────────┤        │
│  │ Input Panel (50vh)                              │        │
│  ├─────────────────────────────────────────────────┤        │
│  │ Preview Panel (50vh)                            │        │
│  └─────────────────────────────────────────────────┘        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

面板宽度由 `uiStore.leftPanelPct` 控制（20%–80%），`ResizableDivider` 支持鼠标拖拽、触摸拖拽和键盘方向键调整。

---

## 16. 构建与部署

```
┌─────────────────────────────────────────────────────────────┐
│                    构建流程                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  npm run build                                              │
│       │                                                     │
│       ├── vue-tsc (类型检查，严格模式)                        │
│       │                                                     │
│       └── vite build                                        │
│             ├── 入口: index.html                             │
│             ├── 输出: dist/                                  │
│             ├── 基础路径: /sqlFormatter/                     │
│             └── 优化:                                        │
│                  • Tree-shaking (highlight.js 仅注册 SQL)    │
│                  • Code splitting (Vite 自动)                │
│                  • CSS 提取                                  │
│                                                             │
│  部署: 纯静态文件，任意 CDN/Web 服务器                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 17. 测试架构

```
tests/
├── formatter.test.ts       # Formatter 类单元测试
├── highlighter.test.ts     # Highlighter 类单元测试
├── previewParser.test.ts   # 纯函数测试（parseBlocks/buildGutterRows/buildCodeHtml）
├── formatterStore.test.ts  # formatterStore pipeline 测试
├── historyStore.test.ts    # historyStore 文档管理测试
└── integration.test.ts     # 端到端集成测试
```

测试环境：Vitest + jsdom + @vue/test-utils

---

## 18. 关键设计决策总结

| 决策 | 原因 |
|------|------|
| Vue 3 Composition API + `<script setup>` | 类型推导好，代码紧凑 |
| Pinia Setup Store | 比 Options Store 更灵活，支持 composable 组合 |
| Store 间无直接依赖，App.vue 协调 | 避免循环依赖，保持可测试性 |
| `isRestoringFromHistory` 标志位 | 防止历史恢复触发 markDirty/autoSave 循环 |
| CodeMirror Compartment 热替换主题 | 避免重建编辑器实例，保留光标/选区/撤销栈 |
| CSS 变量双主题 | 一次切换 data-theme 属性即可，无需 JS 重渲染 |
| previewParser 纯函数 | 可独立测试，不依赖 DOM |
| 格式化 pipeline 永不抛异常 | 用户体验优先，错误时显示原文 + 错误提示 |
| localStorage 持久化 | 零服务器依赖，数据不离开浏览器 |
| 消息队列（Fun System） | 多个彩蛋/进化消息按序播放，不互相覆盖 |
| 拖拽吸附四边（EvolutionWidget） | 不遮挡编辑区域，位置持久化 |

---

## 19. 性能考量

- **防抖格式化**：250ms debounce，避免每次按键都触发格式化
- **防抖保存**：1000ms debounce，减少 localStorage 写入频率
- **highlight.js 按需加载**：仅注册 SQL 语言包，减小 bundle
- **CodeMirror 增量更新**：仅 dispatch changes，不重建编辑器
- **CSS 变量主题**：纯 CSS 切换，零 JS 重渲染开销
- **SQL 截断**：超过 200KB 自动截断，防止 localStorage 溢出

**已知限制**：
- 超过 50,000 字符的 SQL 无 Web Worker 优化
- 格式化在主线程执行，极大 SQL 可能造成短暂卡顿

---

*文档结束*
