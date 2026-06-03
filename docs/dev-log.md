# SQL Formatter — 开发记录

---

## 2026-06-01 | 抽奖插件暂时下线

### 需求背景

应要求暂时下线抽奖插件（LotteryGame），保留组件源码以便后续恢复，仅断开其在 `App.vue` 中的接入。

### 变更方案

在 `App.vue` 中注释掉 `LotteryGame` 的模板使用与 import 语句，并标注「抽奖插件暂时下线」。`src/components/fun/LotteryGame.vue` 组件文件保持不动，方便日后取消注释即可恢复。

### 变更文件

| 文件 | 说明 |
|------|------|
| `src/App.vue` | 注释掉 `<LotteryGame />` 模板使用及其 import |

### 测试结果

- `npm run build` ✓ 零编译错误
- `npm run test -- --run` ✓ 112 tests passed

---

## 2026-05-22 | Bugfix — C# 中文 StackTrace 单行压缩解析失败

### 问题描述

当 C# 中文 stacktrace 所有 frame 压缩在一行（frame 之间只有单个空格分隔）时，`CSharpStrategy.splitIntoLines()` 无法正确拆分，导致整个 stacktrace 被当成 1-2 行处理，解析失败。

### 根因

原有 `FRAME_SPLIT_RE` 要求 frame 前有 `\s{2,}`（2个以上空格），但实际日志中 frame 之间只有单个空格（如 `行号 826 在 S3.FMS...`）。

### 修复方案

新增两个正则 `ZH_FRAME_BOUNDARY_RE` / `EN_FRAME_BOUNDARY_RE`，在单行输入时按 `在 <大写命名空间>` / `at <大写命名空间>` 模式拆分。多行输入保持原有 2+ 空格拆分逻辑不变。

### 变更文件

| 文件 | 说明 |
|------|------|
| `src/formatter/stacktrace/CSharpStrategy.ts` | 新增单行压缩拆分逻辑 |
| `tests/csharp-split-debug.test.ts` | 新增回归测试（完整中文 stacktrace） |

### 测试结果

- `npm run build` ✓ 零编译错误
- `npm run test -- --run` ✓ 112 tests passed

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

---

## 2026-05-14 | v1.6.2 — 修复复制时 HTML 实体编码问题

### 问题描述

复制格式化后的 SQL 时，单引号 `'`、`<`、`>` 等字符被复制为 HTML 实体（`&#x27;`、`&lt;`、`&gt;`），粘贴到其他工具后无法直接使用。

### 根因分析

`PreviewPanel.getPlainText()` 通过正则 `replace(/<[^>]*>/g, '')` 剥除 highlight.js 生成的 HTML 标签，但没有反转义 HTML 实体。highlight.js 在高亮时会对特殊字符做 HTML 转义（`'` → `&#x27;`，`<` → `&lt;` 等），剥标签后这些实体仍残留在文本中。

### 修复方案

在 `PreviewPanel` 中新增 `unescapeHtml()` 私有方法，在 `getPlainText()` 剥标签后调用，将 `&#x27;`、`&quot;`、`&lt;`、`&gt;`、`&amp;` 依次还原为原始字符（`&amp;` 必须最后处理，避免二次转义）。

### 变更文件清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/ui/PreviewPanel.ts` | 修改 | `getPlainText()` 在剥标签后调用 `unescapeHtml()`；新增 `unescapeHtml()` 私有方法 |

### 测试结果

```
Test Files  5 passed (5)
     Tests  73 passed (73)
  Duration  ~3.0s
```

---

## 2026-05-14 | v1.7.0 — SQL 进化论 + 彩蛋系统

### 需求背景

为工具增加趣味性和惊喜感。两个核心功能：
1. **SQL 进化论**：右下角常驻一个「生命体」，随 SQL 复杂度实时进化/退化
2. **彩蛋触发器**：特定 SQL 输入触发隐藏彩蛋效果，有收集图鉴

---

### 变更文件清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/fun/FunMode.ts` | 新增 | 全局开关单例，`isEnabled()` / `setEnabled()`，默认 `true` |
| `src/fun/SqlComplexity.ts` | 新增 | SQL 复杂度评分算法（行数/JOIN/子查询/CTE/窗口函数/UNION），7 级进化定义 |
| `src/fun/EvolutionWidget.ts` | 新增 | 可拖拽、边缘吸附的进化生命体组件；消息队列（terminal/toast/tagline 依次播放，500ms 间隔）；方向自适应气泡 |
| `src/fun/EasterEgg.ts` | 新增 | 8 个彩蛋检测与触发（核弹拦截、删库跑路、清空宇宙、全表扫描、宇宙答案、虚无哲学家、极简主义者、史诗级查询）；发现记录持久化 localStorage |
| `src/fun/EggBook.ts` | 新增 | 彩蛋图鉴面板，点击 `✦` 打开，显示已发现/未发现状态 |
| `src/controller/AppController.ts` | 修改 | `runPipeline()` 末尾调用 `evolutionWidget.update()` 和 `easterEgg.check()` |
| `src/main.ts` | 修改 | 实例化 EvolutionWidget、EasterEgg、EggBook 并传入 AppController |
| `src/styles/main.css` | 修改 | 新增进化组件样式（拖拽、吸附动画、彩虹边框）、终端气泡样式（方向自适应、打字机效果）、彩蛋效果样式（屏幕抖动、蒸发动画、彩带）、图鉴面板样式 |

---

### 关键设计决策

#### 1. FunMode 开关
全局单例，默认开启。后续可通过任何触发方式（Konami Code、Logo 点击、URL 参数）调用 `FunMode.setEnabled(true/false)`，其他代码零改动。

#### 2. 消息队列
所有弹出内容（terminal 气泡、toast、tagline）统一进入 FIFO 队列，`processNext()` 每次只播放一条，播放完成后等 500ms 再取下一条，避免消息堆叠。

#### 3. 可拖拽 + 边缘吸附
mousedown 开始跟踪，mousemove 自由拖动，mouseup 计算距四条边的距离，吸附到最近的边。位置持久化到 localStorage，刷新后恢复。

#### 4. 方向自适应
气泡、tooltip、toast、tagline 的弹出方向根据当前吸附边自动调整：
- 吸附右边 → 向左上弹出
- 吸附左边 → 向右上弹出
- 吸附底部 → 向右上弹出
- 吸附顶部 → 向右下弹出

#### 5. 不打断操作
所有彩蛋效果通过生命体旁边的气泡展示，不使用全屏遮罩，用户可以继续正常操作。终端气泡用打字机效果逐行出现，自动消失。

#### 6. 彩蛋冷却
同一个彩蛋 8 秒内不重复触发，每次 pipeline 只触发一个彩蛋（优先级按定义顺序）。

#### 7. 进化评分算法
| 维度 | 权重 |
|------|------|
| 行数 | ×1 |
| JOIN | ×3 |
| 子查询 | ×5 |
| CTE | ×4 |
| 窗口函数 | ×6 |
| UNION | ×3 |

7 级进化：🦠(0-10) → 🐛(11-30) → 🐟(31-60) → 🦎(61-100) → 🦕(101-150) → 🧠(151-200) → 👾(201+)

---

### 测试结果

```
Test Files  5 passed (5)
     Tests  73 passed (73)
  Duration  ~2.6s
```

---

## 2026-05-14 | v2.0.0 — Vue 3 + Pinia 架构迁移

### 迁移目标

将 SQL Formatter 从原生 TypeScript + 手写 DOM 架构一次性迁移至 Vue 3 + Composition API + `<script setup>`，保持所有现有功能不变。

---

### 变更文件清单

#### 新增文件

| 文件 | 说明 |
|------|------|
| `src/env.d.ts` | Vue SFC 类型声明 |
| `src/App.vue` | 根组件，整体布局骨架，全局快捷键，markDirty/autoSave 逻辑 |
| `src/stores/themeStore.ts` | 主题状态，localStorage 持久化，watch 同步 data-theme |
| `src/stores/uiStore.ts` | 字体大小、面板宽度比例，watch 同步 CSS 变量 |
| `src/stores/formatterStore.ts` | SQL 内容、格式化输出、pipeline（watchDebounced 250ms） |
| `src/stores/historyStore.ts` | 文档 tab 管理、localStorage 持久化、switchTo/newDocument/deleteDoc |
| `src/utils/previewParser.ts` | 从 PreviewPanel.ts 提取的纯函数：parseBlocks/buildGutterRows/buildCodeHtml/escapeHtml/unescapeHtml |
| `src/utils/sqlCap.ts` | 从 HistoryPanel.ts 提取的 capSql 纯函数 |
| `src/composables/useEvoWidget.ts` | EvolutionWidget 拖拽吸附逻辑 composable |
| `src/components/ThemeToggle.vue` | 主题切换开关组件 |
| `src/components/ConfigPanel.vue` | 方言选择 + 设置弹窗组件 |
| `src/components/InputPanel.vue` | CodeMirror 6 编辑器封装，Compartment 热替换主题 |
| `src/components/PreviewPanel.vue` | 折叠/行号/高亮展示，defineExpose foldAll/unfoldAll/getPlainText |
| `src/components/HistoryPanel.vue` | 文档 tab 管理 UI |
| `src/components/CopyButton.vue` | 复制按钮 |
| `src/components/SaveButton.vue` | 保存按钮 |
| `src/components/ResizableDivider.vue` | 拖拽分隔线，写入 uiStore.leftPanelPct |
| `src/components/fun/EvolutionWidget.vue` | 进化论小部件 Vue 组件 |
| `src/components/fun/EggBook.vue` | 彩蛋图鉴弹窗 Vue 组件 |
| `tests/previewParser.test.ts` | previewParser 纯函数单元测试（替代 preview-panel.test.ts） |
| `tests/formatterStore.test.ts` | formatterStore pipeline 测试 |
| `tests/historyStore.test.ts` | historyStore 文档管理测试 |

#### 修改文件

| 文件 | 变更说明 |
|------|---------|
| `package.json` | 新增 vue/pinia/@vueuse/core/@vitejs/plugin-vue/@vue/test-utils/vue-tsc，版本升至 2.0.0 |
| `vite.config.ts` | 添加 @vitejs/plugin-vue 插件 |
| `tsconfig.json` | 添加 jsx/jsxImportSource，include 扩展到 tests |
| `index.html` | 简化为单 `<div id="app">` |
| `src/main.ts` | 改为 createApp(App).use(createPinia()).mount('#app') |
| `src/fun/EasterEgg.ts` | 提取 IEvolutionWidget 接口，解耦具体类依赖 |
| `src/fun/EvolutionWidget.ts` | 实现 IEvolutionWidget 接口 |
| `tests/integration.test.ts` | 迁移为使用 previewParser 纯函数（移除 PreviewPanel DOM 依赖） |
| `tests/highlighter.test.ts` | 移除未使用的 stripped 变量 |

#### 删除文件

| 文件 | 原因 |
|------|------|
| `tests/app-controller.test.ts` | 逻辑已分散到 formatterStore.test.ts + historyStore.test.ts |
| `tests/preview-panel.test.ts` | 替换为 previewParser.test.ts（纯函数，无 DOM 依赖） |

---

### 关键设计决策

1. **Store 单向依赖**：formatterStore 不依赖 historyStore，markDirty/autoSave 逻辑移至 App.vue 的 watchDebounced，避免循环依赖。historyStore 的 switchTo/newDocument/deleteDoc 返回新 sql 字符串，由调用方（HistoryPanel.vue）负责更新 formatterStore.sql。

2. **isRestoringFromHistory 标志位**：在 HistoryPanel.vue 的 handleTabClick/handleNewDocument/handleDeleteDoc 中设置，用 setTimeout(0) 在下一个 tick 清除，防止历史恢复触发 markDirty。

3. **CodeMirror 主题热替换**：InputPanel.vue 使用 Compartment.reconfigure()，watch themeStore.theme 变化，不重建 EditorView 实例。

4. **PreviewPanel 纯函数化**：parseBlocks/buildGutterRows/buildCodeHtml 提取为无 DOM 依赖的纯函数，组件只负责响应式状态和 v-for 渲染，大幅提升可测试性。

5. **EvolutionWidget 拖拽**：拖拽过程中直接操作 el.style（不走响应式），mouseup 时才将吸附位置写入 snapEdge/snapOffset ref（持久化用）。

6. **ConfigPanel 弹窗**：使用 Teleport to="body" + v-show + CSS transition，pendingConfig 本地 reactive，点击"应用"才写入 formatterStore.config。

---

### 测试结果

- `npm run build`：零编译错误，零 TypeScript 错误
- `npm run test -- --run`：86 个测试全部通过（6 个测试文件）
- 构建产物：684.78 kB（gzip: 215.01 kB）

---

## 2026-05-15 | v2.0.1 — 修复 Ctrl+S 无视觉反馈 Bug

### 问题描述

按下 Ctrl+S 后，保存按钮没有任何状态变化（不显示"已保存 ✓"），用户感觉快捷键无效。

### 根因分析

`App.vue` 的全局键盘事件监听器直接调用 `historyStore.saveActiveDoc()`，绕过了 `SaveButton.vue` 的状态机（`idle → saving → saved`）。保存操作确实执行了，但没有触发按钮的视觉反馈。

### 修复方案

1. **SaveButton.vue**：新增 `defineExpose({ triggerSave: handleClick })`，将保存动作暴露给父组件
2. **App.vue**：
   - 模板中给 `<SaveButton>` 添加 `ref="saveBtnRef"`
   - script 中声明 `saveBtnRef = ref<InstanceType<typeof SaveButton>>()`
   - Ctrl+S 处理改为调用 `saveBtnRef.value?.triggerSave()`，移除直接调用 `historyStore.saveActiveDoc()`

### 变更文件清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/components/SaveButton.vue` | 修改 | 新增 `defineExpose({ triggerSave: handleClick })` |
| `src/App.vue` | 修改 | 添加 `saveBtnRef`；Ctrl+S 改为调用 `saveBtnRef.value?.triggerSave()` |

### 测试结果

```
Test Files  6 passed (6)
     Tests  86 passed (86)
  Duration  ~16s
```

---

## 2026-05-15 | v2.0.2 — 重构 Ctrl+S 修复方案（移除命令式耦合）

### 问题背景

v2.0.1 的修复方案（`App.vue` 持有 `saveBtnRef` 并调用 `triggerSave()`）引入了父调子的命令式耦合，违背单向数据流原则：快捷键的执行路径被绑定到一个 UI 子组件，若 `SaveButton` 未挂载则静默失效。

### 重构方案

将保存状态提升到 `historyStore`，`SaveButton` 改为纯响应式组件。

```
Ctrl+S / 按钮点击
  → historyStore.saveActiveDoc()   ← 业务逻辑，唯一入口
  → historyStore.saveStatus        ← 状态提升到 store

SaveButton
  → computed(historyStore.saveStatus)  ← 纯响应式，无 defineExpose
```

### 变更文件清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/stores/historyStore.ts` | 修改 | 新增 `SaveStatus` 类型、`saveStatus` ref、`setSaveStatus()` 私有方法；`saveActiveDoc()` 成功/失败时更新 `saveStatus`，1500ms 后自动重置为 `idle`；`saveStatus` 加入 return |
| `src/components/SaveButton.vue` | 重构 | 移除自有状态机和 `defineExpose`；改为 `computed(historyStore.saveStatus)` 驱动 label 和 class；`handleClick` 直接调用 `historyStore.saveActiveDoc()` |
| `src/App.vue` | 修改 | 移除 `saveBtnRef`；Ctrl+S 改回直接调用 `historyStore.saveActiveDoc(formatterStore.sql)` |

### 测试结果

```
Test Files  6 passed (6)
     Tests  86 passed (86)
  Duration  ~3.6s
```

## 2026-05-15 | v2.0.3 — 格式化预览滚动快捷键 + 快捷键提示重设计

### 需求背景

格式化预览区缺少滚动到首行/末尾的快捷键；同时原有行内快捷键提示随着快捷键数量增加已放不下，需要重新设计展示方式。

---

### 变更文件清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/components/PreviewPanel.vue` | 修改 | 新增 `previewWrapperRef`，暴露 `scrollToTop()` / `scrollToBottom()` 方法，通过 `closest('.panel-body')` 定位滚动容器 |
| `src/App.vue` | 修改 | 注册 `Ctrl+Home` / `Ctrl+End` 快捷键；将行内快捷键提示替换为 `?` 图标 + hover tooltip |
| `src/styles/main.css` | 修改 | 移除 `.panel-shortcuts` 旧样式，新增 `.panel-shortcuts-hint` / `.shortcuts-trigger` / `.shortcuts-tooltip` tooltip 样式 |

---

### 关键设计决策

- **快捷键选择**：`Ctrl+Home` / `Ctrl+End` 是跨平台通用文本导航标准，语义明确，不与 CodeMirror 或系统快捷键冲突（`Ctrl+↑/↓` 在 macOS 会被系统拦截）
- **滚动容器定位**：PreviewPanel 内部通过 `previewWrapperRef.closest('.panel-body')` 向上查找滚动容器，避免组件与外部 DOM 结构强耦合
- **快捷键提示重设计**：从行内文字改为 `?` 图标 + CSS hover tooltip，header 空间不再随快捷键数量增加而拥挤，当前收录 4 条快捷键

---

### 测试结果

- `npm run build` ✓ 零编译错误
- `npm run test -- --run` ✓ 86/86 通过

## 2026-05-15 | v2.0.4 — 快捷键抽屉 UI 重设计

### 需求背景

v2.0.3 的快捷键提示方案（hover tooltip）位置居中遮挡视线，且 UI 质感不足。经过多轮讨论和迭代，最终采用右侧滑入抽屉方案，对标语雀快捷键面板的设计标准。

---

### 变更文件清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/App.vue` | 修改 | 触发图标换为键盘 SVG；`?` 移至复制按钮右侧；抽屉内容改为分组布局（描述在左、kbd 在右）；点击预览区内容关闭抽屉 |
| `src/styles/main.css` | 修改 | 全面重写抽屉样式：宽度 260px、背景用 `--color-bg`、分组标题 13px 正文色、行间距 10px、kbd 精致化（box-shadow 替代 border-bottom、浅色主题白色背景） |

---

### 关键设计决策

- **位置**：抽屉附着在 `.panel-preview`（`position: relative`），`top: 36px` 从 panel-header 下方开始，不遮挡标题栏
- **触发图标**：键盘 SVG 比 `?` 语义更直接，一眼识别
- **图标位置**：复制按钮右侧，作为辅助操作，不抢主操作视觉权重
- **kbd 样式**：暗色主题用极淡 `box-shadow: 0 1px 0 rgba(255,255,255,0.04)` 保留轻微立体感；浅色主题白色背景 + `rgba(0,0,0,0.08)` 阴影
- **字体层级**：分组标题（13px 正文色粗体）> 快捷键名称（12px 正文色）> kbd（10px muted 色）

---

### 测试结果

- `npm run build` ✓ 零编译错误
- `npm run test -- --run` ✓ 86/86 通过

---

## 2026-05-15 | DROP TABLE 彩蛋重设计

### 需求背景

`nuclear` 彩蛋原先调用 `shakeScreen()` 导致整个 body 抖动，干扰感强、与其他彩蛋风格不一致。

### 变更文件清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/fun/EasterEgg.ts` | 修改 | 删除 `shakeScreen()` 函数及调用；`IEvolutionWidget` 新增 `showAlert()` 方法；terminal 文案改为中英混排 |
| `src/components/fun/EvolutionWidget.vue` | 修改 | 实现 `showAlert()`：临时替换 emoji 为 🚨、激活 `evo-widget--alert` 红色闪烁动画；新增 `isAlerting` ref；queue 支持 `alert` 类型 |
| `src/styles/main.css` | 修改 | 删除 `egg-shake-anim` 和 `body.egg-shake`；新增 `evo-alert-border-anim` 和 `.evo-widget--alert`（仅影响 widget 自身） |

### 关键设计决策

- **抖动范围收窄**：从 `body` 级别降为 widget 自身，不打断用户正在进行的操作
- **showAlert 独立入队**：alert 和 terminal 分别入队，alert 先执行（红色闪烁），terminal 紧随其后（倒计时文案），两者时序自然衔接
- **emoji 临时替换**：alert 期间将当前进化 emoji 换成 🚨，结束后恢复，视觉上有明确的"警报→解除"节奏
- **文案中英混排**：保留终端风格的 `>` 前缀和进度条，关键信息用中文，兼顾国内用户可读性

### 测试结果

- `npm run build` ✓ 零编译错误
- `npm run test -- --run` ✓ 86/86 通过

---

## 2026-05-18 | v2.1.0 — 多格式支持（JSON）

### 需求背景

在 SQL 格式化基础上扩展支持 JSON 格式化，采用同页面 mode 切换方案，通过策略模式复用现有 pipeline，不破坏现有架构。

---

### 变更文件清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/types/index.ts` | 修改 | 新增 `FormatterMode`（`'sql' \| 'json'`）、`FormatTarget`（统一选择器值类型） |
| `src/formatter/JsonFormatter.ts` | 新增 | JSON 格式化策略，原生 `JSON.parse` + `JSON.stringify`，无外部依赖，parse 失败返回 error |
| `src/stores/formatterStore.ts` | 修改 | 新增 `mode` ref、`formatTarget` computed、`setFormatTarget()` 方法；pipeline 按 mode 分支执行不同策略 |
| `src/highlighter/Highlighter.ts` | 修改 | 注册 highlight.js JSON 语言包；`highlight()` 参数类型扩展为 `SqlDialect \| 'json'` |
| `src/components/ConfigPanel.vue` | 修改 | 语言下拉框替换为统一格式选择器（SQL·PostgreSQL / SQL·MySQL / SQL·SQLite / JSON）；JSON mode 时隐藏 SQL 专属配置项；localStorage 持久化 formatTarget |
| `src/components/InputPanel.vue` | 修改 | 新增 `langCompartment`，watch `formatterStore.mode` 热替换 CodeMirror 语言扩展（sql ↔ json） |
| `tests/jsonFormatter.test.ts` | 新增 | JsonFormatter 单元测试（5 个） |

### 新增依赖

| 包 | 版本 | 用途 |
|----|------|------|
| `@codemirror/lang-json` | 6.0.2 | CodeMirror JSON 语言支持 |
| `@lezer/json` | 1.0.3 | `@codemirror/lang-json` 的 parser 依赖 |

---

### 关键设计决策

#### 1. 单一输入，mode 决定策略
输入内容（`formatterStore.sql`）在 mode 切换时保持不变。切换 mode 后 pipeline 用新策略重新格式化，格式化失败（如 JSON parse error）在右侧显示错误信息——这是用户的主动选择，工具如实反馈。

#### 2. 统一格式选择器
将原来的"方言下拉框"升级为"格式化目标选择器"，选项为 `SQL · PostgreSQL / SQL · MySQL / SQL · SQLite / JSON`。一个选择器同时承载 mode + dialect，避免 JSON mode 下方言下拉框变成无意义残留。

#### 3. 策略模式扩展性
后续新增 YAML 只需：
1. 新增 `YamlFormatter.ts`
2. `FormatterMode` 加 `'yaml'`
3. `FormatTarget` 加 `'yaml'`
4. formatterStore pipeline 加一个分支
5. ConfigPanel 选择器加一个 option

不需要改动任何现有逻辑。

#### 4. JSON 格式化零依赖
`JsonFormatter` 使用原生 `JSON.parse` + `JSON.stringify`，不引入任何第三方库，bundle size 零增长（仅 highlight.js JSON 语言包约 0.38KB gzip）。

---

### 测试结果

```
Test Files  7 passed (7)
     Tests  91 passed (91)
  Duration  ~5.9s
```

---

## 2026-05-18 | v2.1.1 — 品牌重命名 + JSON 层级折叠

### 需求背景

1. 产品更名为 **Lumino**，配套 slogan：*Paste it. Illuminate it.*
2. JSON mode 新增按层级折叠/展开功能（方向 B：真正的 JSON tree 折叠）

---

### 变更文件清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `index.html` | 修改 | `<title>` 改为 Lumino |
| `src/App.vue` | 修改 | `<h1>` 改为 Lumino，新增 `.app-slogan` 副标题 |
| `src/styles/main.css` | 修改 | 新增 `.app-brand`、`.app-slogan` 样式 |
| `src/utils/previewParser.ts` | 修改 | 新增 `JsonFoldNode` 接口、`MAX_JSON_FOLD_DEPTH` 常量、`parseJsonNodes()`、`buildJsonGutterRows()`、`buildJsonCodeHtml()` 纯函数 |
| `src/components/PreviewPanel.vue` | 修改 | 按 `isSqlMode` 分支渲染 gutter 和代码区；JSON mode 使用 `jsonCollapsed` Map 管理折叠状态 |
| `tests/previewParser.test.ts` | 修改 | 新增 7 个 `parseJsonNodes` / `buildJsonGutterRows` 单元测试 |

---

### 关键设计决策

#### 1. JSON 折叠策略：行扫描 + 栈
不依赖 JSON.parse（格式化后的 HTML 已经是字符串，重新 parse 有额外开销），而是对纯文本逐字符扫描，用栈追踪 `{`/`[` 的开启行。遇到对应的 `}`/`]` 时，若跨行且深度 ≤ `MAX_JSON_FOLD_DEPTH`，则记录为 `JsonFoldNode`。

#### 2. 折叠深度限制（MAX_JSON_FOLD_DEPTH = 1）
只显示深度 0（根节点）和深度 1（第二层）的折叠图标，避免每行都出现图标造成视觉噪音。后续可通过修改常量调整。

#### 3. collapsed 状态用 Map 而非数组
SQL mode 用 `boolean[]`（按 blockIdx 索引），JSON mode 用 `Map<number, boolean>`（按 startLine 索引）。两套状态互不干扰，切换 mode 时各自重置。

#### 4. 折叠摘要
折叠时在 startLine 末尾追加 `… }` 或 `… ]`（根据 endLine 内容判断），简洁直观，与 VS Code JSON 折叠行为一致。

#### 5. foldAll/unfoldAll 按 mode 分支
`PreviewPanel.vue` 的 `foldAll()`/`unfoldAll()` 根据 `isSqlMode` 分别操作 `collapsed` 数组或 `jsonCollapsed` Map，`App.vue` 的快捷键无需感知 mode。

---

### 测试结果

```
Test Files  7 passed (7)
     Tests  98 passed (98)
  Duration  ~4.1s
```

---

## 2026-05-18 | v2.1.2 — JSON 智能解析（递归展开嵌套字符串化 JSON）

### 需求背景

实际业务场景中，接口日志、调试数据常见以下形态：
- 整体是一个带引号的字符串：`"{\"key\":\"value\"}"`
- 字段值本身又是 JSON 字符串（如 `biz`、`args` 字段）
- 多层嵌套，转义层数不定

用户期望粘贴后直接得到完整展开的结构化 JSON，无需手动处理转义。

---

### 变更文件清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/formatter/JsonFormatter.ts` | 修改 | 新增 `deepParse()` 递归展开函数；`format()` 新增外层引号剥离逻辑 |
| `tests/jsonFormatter.test.ts` | 修改 | 新增 4 个测试：外层引号剥离、递归展开、三层嵌套、真实业务数据 |

---

### 关键设计决策

#### 处理流程
```
输入
  → trim()
  → 若以 " 开头结尾 → JSON.parse 剥外层引号
  → JSON.parse 得到对象
  → deepParse() 递归遍历
      → 每个 string 值：若以 { 或 [ 开头结尾 → 尝试 JSON.parse → 递归
      → 失败则保留原字符串
  → JSON.stringify(result, null, indent)
```

#### deepParse 安全性
- 只对以 `{`/`[` 开头、`}`/`]` 结尾的字符串尝试解析，避免误展开普通字符串
- try/catch 包裹，parse 失败静默保留原值，不影响其他字段
- 递归深度由数据结构自然限制，无需额外保护（JSON 本身不允许循环引用）

---

### 测试结果

```
Test Files  7 passed (7)
     Tests  102 passed (102)
  Duration  ~4.9s
```

---

## 2026-05-18 | v2.1.3 — Ctrl+C 复制格式化结果快捷键

### 需求背景

用户希望在不点击复制按钮的情况下，通过 `Ctrl+C` 直接复制格式化后的完整内容，提升操作效率。

---

### 变更文件清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/components/CopyButton.vue` | 修改 | 新增 `defineExpose({ copy })`，将复制动作（含视觉反馈）暴露给父组件 |
| `src/App.vue` | 修改 | 添加 `copyButtonRef`；全局 keydown 新增 `Ctrl+C` 处理：无文本选中且焦点不在 CodeMirror 编辑器内时，调用 `copyButtonRef.value?.copy()`；快捷键抽屉新增"复制"分组 |
| `src/components/fun/EvolutionWidget.vue` | 修复 | 删除未使用的 `focusStartTime` ref（消除 TS6133 编译警告） |
| `tests/previewParser.test.ts` | 修复 | 合并重复的 `import { describe, it, expect }` 语句；将 `parseJsonNodes`/`buildJsonGutterRows` import 移至文件顶部；移除未使用的 `MAX_JSON_FOLD_DEPTH` import |

---

### 关键设计决策

#### 1. 触发条件：无选中文本 + 焦点不在编辑器
`Ctrl+C` 的默认行为是复制选中文本，不能无条件拦截。判断逻辑：
- `window.getSelection()?.toString()` 为空（无文本选中）
- `document.activeElement?.closest('.cm-editor')` 为 null（焦点不在 CodeMirror 内）

两个条件同时满足才拦截，确保编辑器内的正常复制操作不受影响。

#### 2. 复用 CopyButton 的视觉反馈
通过 `defineExpose({ copy })` 暴露 `handleClick` 的封装方法，快捷键触发时与点击按钮走完全相同的代码路径（Clipboard API → execCommand fallback → 成功/失败反馈），保持行为一致性。

#### 3. 快捷键抽屉补充说明
在抽屉顶部新增"复制"分组，展示 `Ctrl+C` 快捷键，让用户可以通过键盘图标发现这个功能。

---

### 测试结果

```
Test Files  7 passed (7)
     Tests  107 passed (107)
  Duration  ~2.7s
```

构建产物：零编译错误，零 TypeScript 错误。

---

## 2026-05-19 | v2.1.0 — StackTrace Formatter

### 需求背景

新增 StackTrace 格式化模式，支持将日志中压缩的异常堆栈信息展开为逐行结构并进行语法高亮。支持 C#（英文 + 中文本地化）、Java、Python 三种语言，采用策略模式实现，便于后续扩展。

### 变更文件清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/types/index.ts` | 修改 | 扩展 `FormatterMode`、`FormatTarget`，新增 `StackTraceLanguage`、`StackFrame`、`StackTraceResult` 类型 |
| `src/formatter/stacktrace/IStackTraceStrategy.ts` | 新增 | 策略接口定义 |
| `src/formatter/stacktrace/CSharpStrategy.ts` | 新增 | C# 解析策略，支持英文 `at`/`in`/`:line N` 和中文 `在`/`位置`/`:行号 N` |
| `src/formatter/stacktrace/JavaStrategy.ts` | 新增 | Java 解析策略，支持 `Caused by:` 和 `(File.java:N)` |
| `src/formatter/stacktrace/PythonStrategy.ts` | 新增 | Python 解析策略，支持 `File "path", line N, in func` |
| `src/formatter/stacktrace/StackTraceFormatter.ts` | 新增 | 入口，按优先级（Python → Java → C#）调度策略 |
| `src/highlighter/StackTraceHighlighter.ts` | 新增 | 将 `StackTraceResult` 渲染为带 `.st-*` CSS 类的 HTML |
| `src/stores/formatterStore.ts` | 修改 | 新增 import、pipeline 分支、`setFormatTarget` case |
| `src/components/ConfigPanel.vue` | 修改 | 格式选择器新增 `<option value="stacktrace">` |
| `src/App.vue` | 修改 | `inputPanelLabel` 新增 stacktrace 分支 |
| `src/styles/main.css` | 修改 | 新增 `--color-st-*` CSS 变量（双主题）+ `.st-*` 样式类 |
| `docs/stacktrace-architecture.md` | 新增 | StackTrace 功能架构设计文档 |

### 关键设计决策

1. **策略模式**：每种语言一个独立文件，实现 `IStackTraceStrategy` 接口。新增语言只需新建文件并在 `StackTraceFormatter` 构造函数中插入，不修改任何现有策略。

2. **检测优先级**：Python（`File "..."` 最独特）→ Java（`Caused by:` 较独特）→ C#（兜底，`at`/`在` 最宽泛）。

3. **中文本地化支持**：`CSharpStrategy` 同时识别 `at`/`在`、`in`/`位置`、`:line N`/`:行号 N`，处理 .NET 中文运行时输出。

4. **压缩日志展开**：日志系统常将多帧压缩为一行（帧间用 2+ 空格分隔），策略层在 `parse()` 前先用正则展开，再逐行解析。

5. **降级安全**：`StackFrame.raw` 保存原始文本，任何无法识别的行都以 `type: 'unknown'` 输出，不丢失内容。

6. **Pipeline 对称**：StackTrace 模式与 SQL/JSON 模式走同一条 `runPipeline()` 分支结构，store 层改动极小。

### 测试结果

- `npm run build`：✓ 零编译错误，93 modules transformed
- `npm run test -- --run`：✓ 109 tests passed (7 test files)

---

## 2026-05-19 | v2.2.1 — 快捷键 macOS 兼容 & 快捷键说明补全

### 需求背景

1. 快捷键抽屉只显示 `Ctrl` 版本，macOS 用户看到的提示不准确
2. `Ctrl+S` 保存快捷键在抽屉中缺失说明
3. macOS 上 `Cmd+Home` / `Cmd+End` 不是标准滚动习惯，需补充 `Cmd+↑` / `Cmd+↓` 别名

### 变更文件清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/App.vue` | 修改 | 新增 `isMac` / `modKey` 平台检测；补充 `Cmd+↑` / `Cmd+↓` 滚动别名；快捷键抽屉动态显示修饰键；补全「保存」分组 |
| `docs/product.md` | 修改 | 快捷键表格新增 macOS 列，补全 `Ctrl+S` 说明，版本升至 v2.2.1 |

### 关键设计决策

- **平台检测**：使用 `navigator.platform` + `navigator.userAgent` 双重检测，`isMac` 为 `const`（组件生命周期内不变），`modKey` 派生为 `⌘` 或 `Ctrl`
- **macOS 滚动别名**：`Cmd+↑` / `Cmd+↓` 是 macOS 文本编辑器的标准「跳到文档首/尾」手势，比 `Cmd+Home/End` 更符合 Mac 用户习惯；两者均支持，不互斥
- **快捷键抽屉**：用 `v-if="isMac"` 分支渲染滚动快捷键，其余用 `{{ modKey }}` 插值统一处理，模板清晰
- **保存快捷键**：`Ctrl+S` / `Cmd+S` 早已在 `keydown` 处理器中实现，此次仅补充抽屉说明，无逻辑变更

### 测试结果

- `npm run build`：✓ 零编译错误，94 模块，6.34s
- `npm run test -- --run`：✓ 109 个测试全部通过（7 个测试文件）

---

## 2026-05-19 | 快捷键说明去硬编码重构

### 需求背景

快捷键抽屉模板中每条快捷键都是硬编码的 HTML，分类标题也写死在模板里。新增或修改快捷键需要同时改模板和逻辑，容易遗漏。

### 变更文件清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/config/shortcuts.ts` | 新增 | 快捷键数据源，每条记录含 `desc`、`win`、`mac` 三个字段 |
| `src/App.vue` | 修改 | 移除硬编码 kbd 模板和分类标题，改为 `v-for` 遍历；整理 import 顺序；移除未使用的 `modKey` |

### 关键设计决策

- **数据驱动**：`SHORTCUTS` 数组是唯一的快捷键数据源，模板只负责渲染，不含任何快捷键文字
- **平台解析在组件层**：`App.vue` 在 setup 阶段将 `SHORTCUTS` map 为 `{ desc, keys }` 的平铺数组，模板只需 `v-for` + `v-for`，无需 `v-if` 分支
- **无分类标题**：按用户要求直接罗列，去掉分组 section-title，UI 更简洁
- **新增快捷键只改一处**：在 `shortcuts.ts` 加一行，抽屉自动更新

### 测试结果

- `npm run build`：✓ 零编译错误，95 模块，3.86s
- `npm run test -- --run`：✓ 109 个测试全部通过

---

## 2026-05-22 | Feature — 分屏方向切换（左右 ↔ 上下）

### 功能描述

新增布局切换按钮，用户可在左右分屏和上下分屏之间一键切换。偏好通过 localStorage 持久化。

### 设计决策

- 按钮放在 header 右侧，紧挨主题切换按钮左侧
- `uiStore` 新增 `layoutDirection` 状态（`'horizontal' | 'vertical'`），使用 `useLocalStorage` 持久化
- `ResizableDivider` 根据方向自动切换拖拽轴（X/Y）和光标样式
- 面板尺寸复用 `leftPanelPct`，水平时控制宽度，垂直时控制高度
- 图标用两个简洁 SVG 表示当前布局方向，点击后切换

### 变更文件

| 文件 | 说明 |
|------|------|
| `src/stores/uiStore.ts` | 新增 `layoutDirection`、`toggleLayout()`、导出 `LayoutDirection` 类型 |
| `src/components/LayoutToggle.vue` | 新建，布局切换按钮组件 |
| `src/components/ResizableDivider.vue` | 支持垂直方向拖拽（clientY）、row-resize 光标、方向键适配 |
| `src/App.vue` | 引入 LayoutToggle，根据方向设置 class 和 style |
| `src/styles/main.css` | 新增 `.app-layout--vertical`、`.layout-toggle-btn` 样式 |

### 测试结果

- `npm run build` ✓ 零编译错误
- `npm run test -- --run` ✓ 112 tests passed

---

## 2026-05-22 | Feature — 分屏图标优化 + 格式选择文档级持久化

### 变更内容

1. **分屏切换按钮图标优化**：改为带分隔线的矩形图标（竖线=左右分屏，横线=上下分屏），更直观简洁。

2. **格式选择保存到文档级别**：每个文档独立记住自己的格式目标（SQL 方言 / JSON / StackTrace），切换文档时自动恢复。

### 设计决策

- `SqlDocument` 接口新增可选字段 `formatTarget?: FormatTarget`
- `historyStore` 新增 `saveFormatTarget(target)` 方法，写入当前活跃文档并持久化
- 切换文档时（`handleTabClick`）：先保存当前文档的 formatTarget，切换后恢复目标文档的 formatTarget
- 新建文档时继承当前 formatTarget
- 删除文档后恢复新活跃文档的 formatTarget
- 启动时从活跃文档恢复 formatTarget
- 全局 `sql-formatter-config` localStorage 仍保留作为默认值（无文档级设置时的 fallback）

### 变更文件

| 文件 | 说明 |
|------|------|
| `src/components/LayoutToggle.vue` | 更换为带分隔线的矩形 SVG 图标 |
| `src/types/index.ts` | `SqlDocument` 新增 `formatTarget?` 字段 |
| `src/stores/historyStore.ts` | 新增 `saveFormatTarget()` 方法，导入 `FormatTarget` 类型 |
| `src/components/ConfigPanel.vue` | 格式切换时调用 `historyStore.saveFormatTarget()` |
| `src/components/HistoryPanel.vue` | 文档切换/新建/删除时保存/恢复 formatTarget |
| `src/App.vue` | 启动时恢复活跃文档的 formatTarget |

### 测试结果

- `npm run build` ✓ 零编译错误
- `npm run test -- --run` ✓ 112 tests passed
