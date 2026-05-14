# SQL Formatter — 开发记录

---

## 2026-05-14 | v1.2.0 — 主题切换、行号、历史记录、字体大小

### 需求背景

在 v1.1.0 基础上新增四项功能：
1. 明亮/暗黑主题切换
2. 格式化结果显示行号
3. 历史记录（最多 3 条，可切换查看）
4. 可调节编辑器与预览字体大小

---

### 变更文件清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/types/index.ts` | 修改 | 新增 `AppTheme`、`HistoryEntry` 类型，`MAX_HISTORY`、`DEFAULT_FONT_SIZE` 常量 |
| `src/ui/ThemeToggle.ts` | 新增 | 主题切换组件，管理 `data-theme` 属性和 localStorage 持久化 |
| `src/ui/HistoryPanel.ts` | 新增 | 历史记录组件，维护最多 3 条记录，支持去重和恢复 |
| `src/ui/InputPanel.ts` | 修改 | 使用 `Compartment` 支持 CodeMirror 主题热替换，新增 `setTheme()` 方法 |
| `src/ui/PreviewPanel.ts` | 修改 | 新增行号 gutter（`preview-gutter`），`setContent()` 时自动重建行号 |
| `src/ui/ConfigPanel.ts` | 修改 | 新增字体大小输入框，新增 `onFontSizeChange()`、`getFontSize()` 方法 |
| `src/controller/AppController.ts` | 修改 | 接入 HistoryPanel、字体大小回调、主题初始化；`runPipeline()` 改为 `public` |
| `src/main.ts` | 修改 | 实例化 ThemeToggle、HistoryPanel，连接主题切换到 InputPanel |
| `index.html` | 修改 | 新增 `#theme-toggle`、`.history-bar`、`#history-panel` DOM 节点；`<html>` 初始 `data-theme="dark"` |
| `src/styles/main.css` | 修改 | 新增明亮主题 CSS 变量（`[data-theme='light']`），新增历史栏、主题按钮、行号 gutter 样式 |
| `src/styles/highlight-theme.css` | 修改 | 语法高亮颜色改用 CSS 变量，支持暗黑/明亮双主题 |
| `tests/app-controller.test.ts` | 修改 | `StubConfigPanel` 补充 `onFontSizeChange()`、`getFontSize()` 方法 |
| `docs/product.md` | 修改 | 更新至 v1.2.0，补充新功能说明 |

---

### 关键设计决策

#### 1. CodeMirror 主题热替换
CodeMirror 6 的扩展系统是不可变的，不能直接修改。使用 `Compartment` 将颜色主题包裹为可替换的扩展槽，切换主题时调用 `view.dispatch({ effects: compartment.reconfigure(newTheme) })`，无需销毁重建编辑器实例，保留光标位置和编辑历史。

#### 2. CSS 变量双主题
所有颜色通过 CSS 自定义属性定义，暗黑主题在 `:root, [data-theme='dark']` 下，明亮主题在 `[data-theme='light']` 下。切换时只修改 `<html data-theme>` 属性，浏览器自动级联更新所有颜色，包括语法高亮（highlight-theme.css 同样使用 CSS 变量）。

#### 3. 行号实现方式
未使用绝对定位或 `counter`，而是在 `preview-wrapper` 中并排放置 `preview-gutter`（flex 列）和 `preview-code`（flex 1）。每次内容更新时，解析 HTML 字符串中的换行数，动态生成 `<span>` 行号元素。行号与代码共享相同的 `font-size`（通过 `--editor-font-size` CSS 变量）和 `line-height`，确保垂直对齐。

#### 4. 历史记录去重策略
`push(sql)` 时先过滤掉与新 SQL 相同的旧条目，再将新条目插入队首，最后截断到 `MAX_HISTORY`。这样相同 SQL 重新格式化时会"刷新"到最新位置，而不是产生重复条目。

#### 5. 字体大小传递
字体大小通过 CSS 自定义属性 `--editor-font-size` 传递，编辑器（`#input-panel .cm-scroller`）和预览区（`.preview-code`、`.preview-gutter`）均引用该变量。AppController 在 `applyFontSize()` 中写入 `document.documentElement.style`，覆盖 `:root` 中的默认值。

---

### 测试结果

```
Test Files  5 passed (5)
     Tests  67 passed (67)
  Duration  ~2.2s
```

所有原有测试通过，`StubConfigPanel` 补充了新方法以匹配更新后的 `AppController` 接口。

---

### 已知问题 / 后续优化方向

- 历史记录目前仅保存在内存中，刷新页面后清空。后续可考虑持久化到 `localStorage`。
- 明亮主题下 CodeMirror 的 SQL 语法高亮颜色通过 `EditorView.theme()` 覆盖，覆盖范围有限（仅覆盖了常用 token 类型）。如需更完整的明亮主题支持，可引入 `@codemirror/theme-one-light` 或 Catppuccin 官方 CM6 主题包。
- 行号 gutter 在极长 SQL（数千行）时会生成大量 DOM 节点，可考虑虚拟化优化。

---

## 2026-05-14 | v1.1.0 — CodeMirror 编辑器 + 格式化配置扩展

### 变更摘要

- 用 CodeMirror 6 替换 `<textarea>`，支持行号、括号匹配、SQL 语法高亮、撤销/重做
- 新增关键字大小写、逗号位置、语句间距配置项
- 新增可拖拽分屏宽度（ResizableDivider）

---

## 2026-05-14 | v1.0.0 — 首个正式版本

### 变更摘要

- 实时 SQL 格式化（防抖 250ms）
- 语法高亮（Catppuccin Mocha 暗色主题）
- 多方言支持：PostgreSQL、MySQL、SQLite
- 可配置缩进宽度、IN 子句值分组
- 一键复制格式化结果
- 响应式布局

---

## 2026-05-14 | v1.3.0 — 设置弹窗 + localStorage 持久化

### 需求背景

1. 首行配置项过多，Header 空间拥挤；将格式化设置收纳进弹窗，方言选择保留在外部
2. 历史记录和设置偏好在刷新后丢失；持久化到 localStorage

---

### 变更文件清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/ui/ConfigPanel.ts` | 修改 | 重构为「方言选择 + 设置按钮」模式；其余配置项移入 Modal 弹窗并按「格式化」/「显示」分类；新增 localStorage 读写（key: `sql-formatter-config`） |
| `src/ui/HistoryPanel.ts` | 修改 | 构造时从 localStorage 加载历史（key: `sql-formatter-history`）；`push()`、`deleteEntry()`、`startRename()` commit 时同步写入 localStorage |
| `src/styles/main.css` | 修改 | 新增 `.settings-btn`、`.settings-overlay`、`.settings-modal`、`.settings-section`、`.settings-row` 等弹窗相关样式；双主题自动适配（使用已有 CSS 变量） |

---

### 关键设计决策

#### 1. 弹窗挂载到 `document.body`
Modal 和 Overlay 直接 `appendChild` 到 `body`，避免被 `overflow: hidden` 的父容器裁剪，确保全屏遮罩和居中定位正确。

#### 2. 弹窗动画
使用 `display: none → flex` 配合 CSS `transform: scale(0.96→1)` + `opacity: 0→1` 实现弹出动画。由于 `display` 切换无法过渡，动画在 `.is-open` 类添加后由浏览器自动触发（初始值在非 open 状态下已设置）。

#### 3. localStorage 数据校验
加载时对每个字段做白名单校验（枚举值、数值范围），防止存储数据被篡改或格式变更导致运行时错误。

#### 4. 历史记录重命名持久化
原实现 `commit()` 只更新内存中的 `entry.label`；本次在 commit 时同步调用 `saveToStorage()`，确保重命名结果在刷新后保留。

---

### 测试结果

```
Test Files  5 passed (5)
     Tests  67 passed (67)
  Duration  ~2.1s
```

ConfigPanel 公共接口（`getConfig`、`onConfigChange`、`onFontSizeChange`、`getFontSize`）未变更，`StubConfigPanel` 无需修改，全部测试通过。

---

## 2026-05-14 | v1.3.1 — 弹窗体验优化 + 启动加载历史

### 变更文件清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/ui/ConfigPanel.ts` | 修改 | 弹窗改为靠上定位（`top: 64px`）；入场动画改为 `translateY(-8px→0) + opacity`；新增 Modal Footer 保存按钮，弹窗内控件变更不再实时触发 callbacks，点击「保存设置」才 apply；设置按钮重设计（透明背景、齿轮旋转动画、激活态高亮） |
| `src/ui/HistoryPanel.ts` | 修改 | 新增 `getLatestEntry()` 公共方法，返回最新一条历史记录或 null |
| `src/controller/AppController.ts` | 修改 | `init()` 时调用 `historyPanel.getLatestEntry()`，有历史则加载最新一条到编辑器；无历史则保持空白编辑器 |
| `src/styles/main.css` | 修改 | 重写设置按钮样式（透明底、hover 填充、active 蓝色高亮、齿轮旋转）；弹窗改为顶部定位 + 下滑入场动画；新增 `.settings-modal-footer`、`.settings-save-btn` 样式 |

### 关键设计决策

#### 1. 弹窗靠上定位
`top: 64px`（Header 高度）+ `left: 50%` 水平居中，入场动画为 `translateY(-8px → 0)` + `opacity 0 → 1`，视觉上从 Header 下方滑出，比垂直居中更自然。

#### 2. 保存按钮 + 暂存模式
弹窗内控件变更不再实时触发格式化，只在点击「保存设置」时统一 apply（调用 `applyAndSave()`）。方言选择仍在弹窗外，保持实时响应。

#### 3. 设置按钮动画
hover/active 时齿轮图标旋转 45°（`transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)`），激活态（弹窗打开时）保持旋转并显示蓝色高亮，给用户明确的状态反馈。

#### 4. 启动加载历史
`AppController.init()` 在绑定事件后、`runPipeline()` 前，检查 `historyPanel.getLatestEntry()`。有记录则用 `restoringFromHistory = true` 保护地调用 `inputPanel.setValue()`，避免触发新的历史写入。

### 测试结果

```
Test Files  5 passed (5)
     Tests  67 passed (67)
  Duration  ~2.0s
```

---

## 2026-05-14 | v1.4.0 — 文档管理重构（替代历史记录）

### 问题背景

原"历史记录"设计存在三个根本缺陷：
1. 没有"文档"概念——每次编辑都会产生新历史条目，用户无法持续编辑同一份 SQL
2. 只剩一条时仍可删除，导致空状态
3. 用户担心超大 SQL 撑爆 localStorage（实际 5MB 限额，200KB/条完全可行，但需要加保护）

### 变更文件清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/types/index.ts` | 修改 | 新增 `SqlDocument` 接口；新增 `MAX_DOCUMENTS=5`、`MAX_SQL_BYTES=200*1024` 常量；保留 `HistoryEntry`（标记 deprecated）和 `MAX_HISTORY`（向后兼容） |
| `src/ui/HistoryPanel.ts` | 重写 | 从"历史记录列表"重构为"文档标签页管理器"；编辑更新当前文档而非新建；最多 5 个文档；只剩一个时删除按钮禁用；双击标签重命名；SQL 超 200KB 自动截断；两个 localStorage key 分别存文档列表和当前激活 id |
| `src/controller/AppController.ts` | 修改 | 移除 `push()`/`restoringFromHistory` 逻辑；新增 `saveDebounceTimer`（1s）在编辑停止后调用 `updateActiveSql()`；文档切换通过 `onSwitch()` 回调加载 SQL；`loadingDoc` 标志位防止切换时触发保存 |
| `index.html` | 修改 | 移除 `history-bar-label`（"历史"文字标签），文档栏直接显示标签页 |
| `src/styles/main.css` | 修改 | 新增文档标签页样式（`.doc-tab`、`.doc-tab-list`、`.doc-new-btn`、`.doc-tab-delete`、`.doc-tab-rename-input`）；保留旧 history-item 样式（兼容） |

### 关键设计决策

#### 1. 文档 vs 历史
文档是持久化的命名工作区，不随编辑自动增殖。用户主动点"+"才创建新文档，编辑只更新当前文档的 sql 字段。

#### 2. 双防抖分离
- 格式化防抖 250ms：输入停止后快速更新预览
- 保存防抖 1000ms：输入停止后 1s 才写 localStorage，避免高频写入

#### 3. localStorage 可行性
单条 SQL 上限 200KB（`MAX_SQL_BYTES`），5 条文档最多 1MB，远低于 5MB 限额。超限时 `capSql()` 按字节截断。写入失败时自动淘汰最旧文档直到成功。

#### 4. 删除保护
`deleteDoc()` 在 `docs.length <= 1` 时直接返回；UI 层 `deleteBtn.disabled = isOnly`，视觉上也禁用。

#### 5. 向后兼容
`push()`、`onRestore()`、`getLatestEntry()` 保留为 no-op / 转发，避免测试 Stub 失效。

### 测试结果

```
Test Files  5 passed (5)
     Tests  67 passed (67)
  Duration  ~16s (环境初始化较慢，测试本身 ~0.6s)
```

---

## 2026-05-14 | v1.6.0 — 语句折叠功能

### 需求背景

格式化多条 SQL 语句时，预览区内容较长，难以快速定位某条语句。新增语句折叠功能，支持逐条折叠/展开，以及全局快捷键批量操作。

---

### 变更文件清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/ui/PreviewPanel.ts` | 修改 | 新增 `StatementBlock` 接口；`setContent()` 改为解析多语句块并渲染折叠 UI；新增 `foldAll()`、`unfoldAll()` 公共方法；`getPlainText()` 从 blocks 重建完整文本（折叠状态不影响复制） |
| `src/controller/AppController.ts` | 修改 | 键盘事件监听扩展：`Ctrl+Shift+[` 调用 `previewPanel.foldAll()`，`Ctrl+Shift+]` 调用 `previewPanel.unfoldAll()` |
| `index.html` | 修改 | 预览区 panel-header 新增 `.panel-shortcuts` 快捷键说明（Ctrl+Shift+[ / ]） |
| `src/styles/main.css` | 修改 | 新增 `.panel-shortcuts`、`kbd` 样式；新增 `.fold-block`、`.fold-toggle`、`.fold-content`、`.fold-separator`、`.is-collapsed` 折叠相关样式 |

---

### 关键设计决策

#### 1. 语句分割策略
以"空行"为分隔符（plain text 为空的行）将 HTML 内容切分为 `StatementBlock[]`。这与 sql-formatter 的 `linesBetweenQueries` 配置天然对齐——格式化后多条语句之间必有空行。单条语句时不渲染折叠控件，避免无意义的 UI 噪音。

#### 2. 折叠后显示
折叠态只显示第一行纯文本（去除 HTML 标签），超过 60 字符截断并追加 ` …`，配合 `▶` 图标。展开态显示 `▼` 图标 + 完整高亮 HTML。

#### 3. 复制行为
`getPlainText()` 从 `blocks` 重建完整文本（遍历所有 block 的 htmlLines，无论折叠状态），确保复制按钮始终复制完整 SQL，不受折叠状态影响。

#### 4. 行号同步
多语句模式下，行号根据当前可见行数（折叠块计 1 行，展开块计实际行数，块间分隔符计 1 行）动态重建，与视觉内容保持对齐。

#### 5. 快捷键选择
采用 VS Code 风格 `Ctrl+Shift+[` / `Ctrl+Shift+]`，与折叠/展开语义一致，用户有肌肉记忆。快捷键说明以 `<kbd>` 标签展示在预览区 panel-header 中，首次使用即可发现。

---

### 测试结果

```
Test Files  5 passed (5)
     Tests  73 passed (73)
  Duration  ~2.4s
```

全部原有测试通过，`PreviewPanel` 接口向后兼容（`setContent`、`setPlaceholder`、`setError`、`getPlainText` 行为不变）。

---

## 2026-05-14 | v1.6.1 — 折叠功能架构重构与 Bug 修复

### 问题背景

v1.6.0 的折叠实现存在多个根本性问题，经过多轮迭代修复：

1. **折叠图标错位**：图标放在代码区内，在 `white-space: pre` 的 `<pre>` 里混用 `<div>` 导致布局错乱
2. **展开后内容错乱**：用 `display: inline` 的 `<span>` 逐行拼接，块级元素插入额外换行
3. **语句分割错误**：分号边界把一条大语句（如 `CREATE ... AS SELECT ...`）切成几十个 block
4. **行号不随折叠变化**：折叠后行号不变，应跳跃体现折叠
5. **注释行被折叠**：注释和 SQL 在同一 block，折叠时注释消失
6. **快捷键无效**：`Ctrl+Shift+[` 的 `e.key` 在多数键盘上是 `{` 而非 `[`
7. **空行无行号**：块间分隔空行没有行号显示

---

### 最终架构方案

**折叠控件移入 gutter，代码区保持纯净**：

```
.preview-wrapper
  .preview-gutter                    ← 行号 + 折叠图标
    .gutter-row × (可见行数)
      .gutter-num                    ← 原始行号
      .gutter-fold (可选)            ← ▶/▼，hover gutter 时显示
  .preview-code (white-space:pre)    ← 纯代码，只含文本节点和 highlight.js <span>
    code
      ← 展开：htmlLines.join('\n')
      ← 折叠：<span class="fold-summary">摘要 …</span>
      ← 块间：'\n\n' 文本节点
```

代码区不插入任何块级 DOM 元素，`white-space: pre` 完全正常工作。

---

### 语句解析算法（parseBlocks）

```
Phase 1: 按空行切分为候选 blocks
Phase 2: 遍历候选 blocks
  - 若候选块全是注释行 → 独立 block，不参与合并
  - 若候选块是 SQL → 向后合并直到末尾有分号（处理 WITH…SELECT）
    - 合并时遇到注释块 → 停止合并，注释块由外层循环单独处理
Phase 3: 计算每个 block 的 leadingCommentCount 和 foldAnchorLine
  - leadingCommentCount：头部注释/空行数量
  - foldAnchorLine：第一个非注释非空行的索引
```

**注释保留策略**：折叠时先渲染 `leadingCommentCount` 行注释（始终可见），再渲染 anchor 行摘要，其余 SQL 行隐藏。注释永远不会被折叠。

---

### 变更文件清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/ui/PreviewPanel.ts` | 重写 | 架构重构：折叠控件移入 gutter；`StatementBlock` 新增 `leadingCommentCount` 字段；`parseBlocks` 重写为三阶段算法；`render()` 重写为代码区纯文本拼接 + gutter 逐行构建；注释行折叠时保留可见 |
| `src/controller/AppController.ts` | 修改 | 快捷键同时匹配 `[`/`{` 和 `]`/`}` 解决键盘兼容问题 |
| `src/styles/main.css` | 修改 | 重写 gutter 样式为 `.gutter-row` / `.gutter-num` / `.gutter-fold`；`.preview-gutter:hover .gutter-fold` 实现 hover gutter 显示所有折叠图标；代码区恢复 `white-space: pre`；移除旧的 `.fold-block`、`.fold-line` 等错误样式 |

---

### 关键设计决策

#### 1. 折叠控件在 gutter 而非代码区
参考 VS Code / GitHub 编辑器：折叠图标在行号右侧，不占用代码区空间，代码对齐不受影响。代码区只有纯文本 + highlight.js span，`white-space: pre` 完全正常。

#### 2. 行号显示原始行号
折叠后 gutter 只渲染可见行的行号，行号值是原始行号（不重新计数）。折叠块只显示 anchor 行的行号，展开后行号连续显示，折叠区间的行号自然消失，与 VS Code 行为一致。

#### 3. 注释行永远可见
`leadingCommentCount` 记录 block 头部注释行数。折叠时先渲染这些注释行，再渲染 SQL 摘要行。`foldable` 判断改为 `sqlLineCount > 1`（SQL 部分超过 1 行才可折叠），纯注释 block 不显示折叠图标。

#### 4. hover gutter 显示所有图标
`.preview-gutter:hover .gutter-fold { opacity: 1 }` — 鼠标移入行号区时所有折叠图标同时显示，移出后隐藏。比逐行 hover 更易发现和操作。

#### 5. 快捷键兼容性
`Ctrl+Shift+[` 在大多数键盘上 `e.key` 是 `{`（Shift+[ 的字符），同时匹配两种值确保跨键盘布局兼容。

---

### 测试结果

```
Test Files  5 passed (5)
     Tests  73 passed (73)
  Duration  ~2.5s
```
