# Vue 迁移技术设计文档

## 概述

将 SQL Formatter 从原生 TypeScript + 手写 DOM 架构，一次性迁移至 Vue 3 + Composition API + `<script setup>` 架构。迁移目标是保持所有现有功能不变，同时获得声明式模板、响应式状态管理和更清晰的组件边界。

---

## 1. 高层架构设计（High-Level Design）

### 1.1 架构对比

| 维度 | 迁移前 | 迁移后 |
|------|--------|--------|
| 渲染方式 | 手写 DOM（`document.createElement`） | Vue 声明式模板 |
| 状态管理 | `AppController` 命令式协调 | Pinia store + composable |
| 组件通信 | 回调函数链（`onSwitch`、`onFlushNeeded`） | store action + `watch` |
| 主题切换 | `document.documentElement.setAttribute` | `useThemeStore` + `watch` |
| 字体大小 | `document.documentElement.style.setProperty` | store 写入，CSS 变量响应 |
| 测试 | Vitest + jsdom | Vitest + `@vue/test-utils` |

### 1.2 目录结构

```
src/
  main.ts                        # createApp + Pinia 挂载
  App.vue                        # 根组件，整体布局骨架
  stores/
    formatterStore.ts            # SQL 内容、格式化输出、pipeline 逻辑
    historyStore.ts              # 文档 tab 管理、localStorage 持久化
    themeStore.ts                # 主题状态、localStorage 持久化
    uiStore.ts                   # 字体大小、面板宽度比例
  composables/
    useFormatter.ts              # 封装 Formatter 类实例
    useHighlighter.ts            # 封装 Highlighter 类实例
    useResizable.ts              # 拖拽分隔线逻辑（提取自 ResizableDivider.ts）
    useEvoWidget.ts              # EvolutionWidget 拖拽吸附逻辑
  components/
    AppHeader.vue                # header 布局容器
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
  formatter/
    Formatter.ts                 # 直接复用，零改动
  highlighter/
    Highlighter.ts               # 直接复用，零改动
  fun/
    EasterEgg.ts                 # 直接复用，逻辑层
    FunMode.ts                   # 直接复用
    SqlComplexity.ts             # 直接复用
  types/
    index.ts                     # 直接复用，零改动
  styles/
    main.css                     # 直接复用，CSS 变量机制不变
    highlight-theme.css          # 直接复用
index.html                       # 简化为单 <div id="app">
```

### 1.3 数据流

```
用户输入 SQL
  → InputPanel.vue（emit 'update:modelValue'）
  → formatterStore.sql（ref）
  → watchDebounced(sql + config, 250ms)
  → Formatter.format()  →  FormatResult
  → Highlighter.highlight()  →  HTML string
  → formatterStore.outputHtml（ref）
  → PreviewPanel.vue（v-html 渲染）
  → historyStore.markDirty()（每次 sql 变化）
  → watchDebounced(sql, 1000ms) → historyStore.saveActiveDoc()
```

### 1.4 新增依赖

```json
{
  "dependencies": {
    "vue": "3.4.x",
    "pinia": "2.1.x"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "4.6.x",
    "@vue/test-utils": "2.4.x",
    "@vueuse/core": "10.9.x"
  }
}
```

`@vueuse/core` 提供：`watchDebounced`、`useEventListener`、`useLocalStorage`，替代大量手写防抖和事件监听代码。

---

## 2. 低层设计（Low-Level Design）

### 2.1 Pinia Stores

#### `formatterStore.ts`

```typescript
export const useFormatterStore = defineStore('formatter', () => {
  const sql = ref('')
  const config = ref<FormatterConfig>({ ...DEFAULT_CONFIG })
  const outputHtml = ref('')
  const errorMessage = ref<string | undefined>()
  const isRestoringFromHistory = ref(false)

  const formatter = new Formatter()
  const highlighter = new Highlighter()

  // 格式化 pipeline（防抖 250ms）
  watchDebounced(
    [sql, config],
    () => {
      if (!sql.value.trim()) { outputHtml.value = ''; errorMessage.value = undefined; return }
      const result = formatter.format(sql.value, config.value)
      outputHtml.value = highlighter.highlight(result.text, config.value.dialect)
      errorMessage.value = result.error
    },
    { debounce: 250, deep: true }
  )

  return { sql, config, outputHtml, errorMessage, isRestoringFromHistory }
})
```

#### `historyStore.ts`

```typescript
export const useHistoryStore = defineStore('history', () => {
  const docs = ref<SqlDocument[]>([])
  const activeId = ref('')
  const dirtyId = ref<string | null>(null)
  const docCounter = ref(0)

  // 关键 action：切换文档（含时序控制）
  async function switchTo(id: string, flushFn: () => void) {
    if (id === activeId.value) return
    if (dirtyId.value === activeId.value) flushFn()   // 先保存当前
    const formatterStore = useFormatterStore()
    formatterStore.isRestoringFromHistory = true
    activeId.value = id
    formatterStore.sql = getActiveDoc()!.sql
    await nextTick()
    formatterStore.isRestoringFromHistory = false
  }

  function saveActiveDoc(sql: string) { /* 更新 doc.sql + localStorage */ }
  function markDirty() { dirtyId.value = activeId.value }
  function getActiveDoc(): SqlDocument | null { /* ... */ }

  return { docs, activeId, dirtyId, switchTo, saveActiveDoc, markDirty, getActiveDoc }
})
```

#### `themeStore.ts`

```typescript
export const useThemeStore = defineStore('theme', () => {
  const theme = useLocalStorage<AppTheme>('sql-formatter-theme', () =>
    window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  )

  watch(theme, (t) => {
    document.documentElement.setAttribute('data-theme', t)
  }, { immediate: true })

  return { theme }
})
```

#### `uiStore.ts`

```typescript
export const useUiStore = defineStore('ui', () => {
  const fontSize = useLocalStorage('sql-formatter-font-size', DEFAULT_FONT_SIZE)

  watch(fontSize, (size) => {
    const safe = Math.max(10, Math.min(24, size))
    document.documentElement.style.setProperty('--editor-font-size', `${safe}px`)
  }, { immediate: true })

  const leftPanelPct = ref(50)   // 面板宽度比例，ResizableDivider 写入

  return { fontSize, leftPanelPct }
})
```

---

### 2.2 关键组件设计

#### `InputPanel.vue`（最高难度）

**核心约定**：`<div ref="editorContainer">` 永远不被 `v-if` 销毁，CodeMirror 实例在 `onMounted` 创建，在 `onUnmounted` 销毁。

```vue
<template>
  <div ref="editorContainer" class="panel-body" />
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { EditorView, Compartment } from '@codemirror/...'
import { useThemeStore } from '../stores/themeStore'
import { useFormatterStore } from '../stores/formatterStore'

const editorContainer = ref<HTMLElement>()
const themeCompartment = new Compartment()
let view: EditorView | null = null

const formatterStore = useFormatterStore()
const themeStore = useThemeStore()

onMounted(() => {
  view = new EditorView({
    parent: editorContainer.value!,
    state: EditorState.create({
      doc: formatterStore.sql,
      extensions: [
        /* ... 所有扩展 ... */
        themeCompartment.of(getThemeExtensions(themeStore.theme)),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            formatterStore.sql = update.state.doc.toString()
          }
        }),
      ]
    })
  })
})

// 外部写入 sql（历史恢复）→ 同步到编辑器
watch(() => formatterStore.sql, (val) => {
  if (!view || val === view.state.doc.toString()) return
  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: val } })
})

// 主题热替换（Compartment，不重建 view）
watch(() => themeStore.theme, (theme) => {
  view?.dispatch({ effects: themeCompartment.reconfigure(getThemeExtensions(theme)) })
})

onUnmounted(() => view?.destroy())
</script>
```

#### `PreviewPanel.vue`

解析逻辑（`parseBlocks`、`buildGutterRows`、`buildCodeHtml`）从原 `PreviewPanel.ts` 提取为纯函数，放入 `src/utils/previewParser.ts`，组件只负责响应式状态和模板渲染。

```vue
<template>
  <div class="preview-wrapper">
    <div class="preview-gutter">
      <div v-for="row in gutterRows" :key="row.key" class="gutter-row">
        <span class="gutter-num">{{ row.lineNum }}</span>
        <button v-if="row.foldable" @click="toggleBlock(row.blockIdx)"
                :aria-label="collapsed[row.blockIdx] ? '展开语句' : '折叠语句'">
          {{ collapsed[row.blockIdx] ? '▶' : '▼' }}
        </button>
      </div>
    </div>
    <pre class="preview-code" :class="{ 'is-placeholder': isPlaceholder }">
      <code v-html="renderedHtml" />
    </pre>
  </div>
  <div v-if="errorMessage" class="preview-error" role="alert">⚠ {{ errorMessage }}</div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useFormatterStore } from '../stores/formatterStore'
import { parseBlocks, buildGutterRows, buildCodeHtml } from '../utils/previewParser'

const formatterStore = useFormatterStore()
const collapsed = ref<boolean[]>([])

const blocks = computed(() => {
  collapsed.value = []   // 重置折叠状态（新内容）
  return parseBlocks(formatterStore.outputHtml)
})

const gutterRows = computed(() => buildGutterRows(blocks.value, collapsed.value))
const renderedHtml = computed(() => buildCodeHtml(blocks.value, collapsed.value))
const isPlaceholder = computed(() => !formatterStore.sql.trim())
const errorMessage = computed(() => formatterStore.errorMessage)

function toggleBlock(idx: number) {
  collapsed.value = collapsed.value.map((v, i) => i === idx ? !v : v)
}

// 暴露给父组件（Ctrl+Shift+[ / ]）
defineExpose({
  foldAll: () => { collapsed.value = blocks.value.map(b => b.htmlLines.length - b.leadingCommentCount > 1) },
  unfoldAll: () => { collapsed.value = blocks.value.map(() => false) },
  getPlainText: () => blocks.value.map(b => b.htmlLines.join('\n').replace(/<[^>]*>/g, '')).join('\n\n')
})
</script>
```

#### `HistoryPanel.vue`

tab 渲染完全声明式，重命名状态用 `ref<string | null>(null)` 跟踪当前正在编辑的 tab id。

```vue
<template>
  <div class="doc-tab-list" role="tablist">
    <div v-for="doc in historyStore.docs" :key="doc.id"
         class="doc-tab" :class="{ 'is-active': doc.id === historyStore.activeId }"
         @click="handleTabClick(doc.id)">
      <span class="doc-tab-label" @dblclick="startRename(doc.id)">
        {{ doc.label }}
        <span v-if="historyStore.dirtyId === doc.id" class="doc-tab-dirty" />
      </span>
      <!-- rename input -->
      <input v-if="renamingId === doc.id" v-model="renameValue"
             class="doc-tab-rename-input" @blur="commitRename(doc)"
             @keydown.enter="commitRename(doc)" @keydown.esc="renamingId = null" />
      <div class="doc-tab-actions">
        <button @click.stop="startRename(doc.id)">✏</button>
        <button @click.stop="historyStore.deleteDoc(doc.id)"
                :disabled="historyStore.docs.length === 1">✕</button>
      </div>
    </div>
    <button v-if="historyStore.docs.length < MAX_DOCUMENTS"
            class="doc-new-btn" @click="historyStore.newDocument()">+</button>
  </div>
</template>
```

#### `EvolutionWidget.vue`

拖拽逻辑提取到 `useEvoWidget.ts` composable，组件模板只负责渲染 emoji、level、tooltip、bubble 队列。拖拽过程中直接操作 `templateRef.value.style`，不走响应式（避免高频更新触发 Vue 重渲染）。

#### `ConfigPanel.vue`

设置弹窗用 `v-show` + CSS transition 控制显隐（与原实现一致），所有表单控件用 `v-model` 双向绑定到本地 `pendingConfig` ref，点击"应用"时才写入 `formatterStore.config`。

---

### 2.3 App.vue 快捷键处理

原 `AppController` 中的全局快捷键移至 `App.vue` 的 `onMounted`：

```typescript
const previewPanelRef = ref<InstanceType<typeof PreviewPanel>>()
const historyStore = useHistoryStore()
const formatterStore = useFormatterStore()

useEventListener(document, 'keydown', (e: KeyboardEvent) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    historyStore.saveActiveDoc(formatterStore.sql)
  }
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === '[' || e.key === '{')) {
    e.preventDefault()
    previewPanelRef.value?.foldAll()
  }
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === ']' || e.key === '}')) {
    e.preventDefault()
    previewPanelRef.value?.unfoldAll()
  }
})
```

---

### 2.4 提取的纯函数工具

| 文件 | 来源 | 内容 |
|------|------|------|
| `src/utils/previewParser.ts` | `PreviewPanel.ts` | `parseBlocks`、`buildGutterRows`、`buildCodeHtml`、`escapeHtml`、`unescapeHtml` |
| `src/utils/sqlCap.ts` | `HistoryPanel.ts` | `capSql`（字节截断） |

这些纯函数与 DOM 无关，可以直接在 Vitest 中测试，无需 jsdom。

---

### 2.5 测试策略

| 测试类型 | 工具 | 覆盖范围 |
|----------|------|---------|
| 纯函数单元测试 | Vitest | `Formatter`、`Highlighter`、`previewParser`、`SqlComplexity` |
| Store 测试 | Vitest + `@pinia/testing` | `formatterStore` pipeline、`historyStore` 时序 |
| 组件测试 | `@vue/test-utils` | `ConfigPanel`、`HistoryPanel`、`CopyButton`、`SaveButton` |
| InputPanel 测试 | 跳过自动化（CodeMirror 需真实 DOM） | 手动验证 |

原有 `tests/` 目录中的测试逐步迁移：
- `formatter.test.ts` → 直接复用
- `highlighter.test.ts` → 直接复用
- `app-controller.test.ts` → 替换为 `formatterStore.test.ts` + `historyStore.test.ts`
- `preview-panel.test.ts` → 替换为 `previewParser.test.ts`（纯函数，更易测试）

---

## 3. 迁移边界约定

1. **CSS 不动**：`main.css` 和 `highlight-theme.css` 全部保留，CSS 变量双主题机制不变
2. **逻辑层不动**：`Formatter.ts`、`Highlighter.ts`、`FunMode.ts`、`SqlComplexity.ts`、`EasterEgg.ts` 直接复用
3. **类型不动**：`src/types/index.ts` 直接复用
4. **CodeMirror 容器不被 v-if 控制**：`InputPanel.vue` 的根 div 永远存在，主题/内容通过 `Compartment.reconfigure` 和 `dispatch` 更新
5. **历史恢复标志位**：`formatterStore.isRestoringFromHistory` 在 `historyStore.switchTo` 的 `nextTick` 前后设置/清除，`watchDebounced` 回调中检查此标志跳过 `markDirty`
6. **EvolutionWidget 拖拽**：拖拽过程中直接操作 `el.style`，`mouseup` 时才将吸附位置写入响应式状态（持久化用）
