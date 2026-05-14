# Design Document

## Overview

SQL Formatter 是一个纯前端单页面应用（SPA），运行于浏览器端，无需服务器。用户在左侧 Input Panel 输入原始 SQL，右侧 Preview Panel 实时展示格式化后的带语法高亮的结果。应用使用 Vite 构建，最终产物为可独立部署的静态资源。

核心技术栈：
- **构建工具**：Vite
- **格式化引擎**：`sql-formatter`（npm 包）
- **语法高亮**：`highlight.js`（SQL 语言包）
- **语言**：TypeScript + HTML + CSS（无框架，原生 DOM）

---

## Architecture

应用采用单向数据流架构，分为三层：

```
┌─────────────────────────────────────────────────────────┐
│                        UI Layer                         │
│  InputPanel  │  ConfigPanel  │  PreviewPanel  │ Toolbar │
└──────────────────────┬──────────────────────────────────┘
                       │ events (input, config change)
                       ▼
┌─────────────────────────────────────────────────────────┐
│                   Controller Layer                      │
│         AppController (debounce + orchestration)        │
└──────┬──────────────────────────────────────┬───────────┘
       │                                      │
       ▼                                      ▼
┌─────────────────┐                ┌──────────────────────┐
│  Formatter      │                │  Highlighter         │
│  (sql-formatter)│                │  (highlight.js)      │
└─────────────────┘                └──────────────────────┘
```

**数据流**：
1. 用户在 InputPanel 输入 SQL 或修改 ConfigPanel 配置
2. AppController 收到事件，经 debounce（≤300ms）后触发格式化流水线
3. Formatter 将原始 SQL + 当前配置 → 格式化文本
4. Highlighter 将格式化文本 → 带 HTML 标签的高亮 HTML
5. PreviewPanel 更新 DOM，展示高亮结果

---

## Components

### 1. AppController

应用的核心协调器，负责：
- 监听 InputPanel 的 `input` 事件，使用 `debounce` 延迟触发格式化
- 监听 ConfigPanel 的配置变更事件，立即触发格式化
- 调用 `Formatter.format()` 获取格式化文本
- 调用 `Highlighter.highlight()` 获取高亮 HTML
- 将结果写入 PreviewPanel
- 处理格式化错误，展示错误提示

```typescript
class AppController {
  private config: FormatterConfig;
  private debouncedFormat: () => void;

  constructor(
    private inputPanel: InputPanel,
    private previewPanel: PreviewPanel,
    private configPanel: ConfigPanel,
    private formatter: Formatter,
    private highlighter: Highlighter
  ) {}

  init(): void;
  private handleInputChange(): void;
  private handleConfigChange(config: Partial<FormatterConfig>): void;
  private runPipeline(): void;
}
```

### 2. Formatter

封装 `sql-formatter` 库，负责：
- 接收原始 SQL 文本和 `FormatterConfig`
- 调用 `sql-formatter` 的 `format()` API
- 对多语句结果进行后处理：插入语句间空行、去除尾部空行
- 对 IN 子句进行后处理：按 `valuesPerLine` 分组换行
- 返回格式化后的纯文本

```typescript
class Formatter {
  format(sql: string, config: FormatterConfig): FormatResult;
  private postProcessStatements(formatted: string): string;
  private postProcessInClauses(formatted: string, valuesPerLine: number): string;
}

interface FormatResult {
  text: string;
  error?: string;
}
```

### 3. Highlighter

封装 `highlight.js`，负责：
- 接收格式化后的纯文本 SQL
- 调用 `hljs.highlight()` 生成带 HTML 标签的高亮字符串
- 确保输出 HTML 不改变原始文本内容（仅添加标签）

```typescript
class Highlighter {
  highlight(formattedSql: string, dialect: SqlDialect): string;
}
```

### 4. InputPanel

左侧输入区域，封装 `<textarea>` 元素：
- 暴露 `getValue()` / `setValue()` 方法
- 触发 `onChange` 回调

```typescript
class InputPanel {
  getValue(): string;
  setValue(value: string): void;
  onChange(callback: (value: string) => void): void;
}
```

### 5. PreviewPanel

右侧预览区域，封装 `<div>` 元素：
- `setContent(html: string)` — 设置高亮 HTML
- `setPlaceholder()` — 显示空状态占位符
- `setError(message: string)` — 显示错误提示
- `getPlainText()` — 返回不含 HTML 标签的纯文本（供复制功能使用）

```typescript
class PreviewPanel {
  setContent(html: string): void;
  setPlaceholder(): void;
  setError(message: string): void;
  getPlainText(): string;
}
```

### 6. ConfigPanel

配置区域，包含以下控件：
- **方言选择**：`<select>`，选项：PostgreSQL / MySQL / SQLite，默认 PostgreSQL
- **缩进宽度**：`<select>` 或 radio，选项：2 / 4，默认 2
- **每行值数量**：`<input type="number">`，范围 1–100，默认 3

```typescript
class ConfigPanel {
  getConfig(): FormatterConfig;
  onConfigChange(callback: (config: FormatterConfig) => void): void;
}
```

### 7. CopyButton

复制按钮组件：
- 调用 `navigator.clipboard.writeText()` 写入剪贴板
- 成功后显示确认提示（1–3 秒后恢复）
- 失败后显示错误提示

```typescript
class CopyButton {
  constructor(previewPanel: PreviewPanel) {}
  private async handleClick(): Promise<void>;
  private showSuccess(): void;
  private showError(): void;
}
```

---

## Data Models

### FormatterConfig

```typescript
interface FormatterConfig {
  dialect: SqlDialect;        // 当前选择的 SQL 方言
  indentWidth: 2 | 4;         // 缩进宽度（空格数），默认 2
  valuesPerLine: number;      // IN 子句每行值数量，范围 1–100，默认 3
}
```

### SqlDialect

```typescript
type SqlDialect = 'postgresql' | 'mysql' | 'sqlite';
```

### FormatResult

```typescript
interface FormatResult {
  text: string;       // 格式化后的纯文本 SQL
  error?: string;     // 若格式化失败，包含错误描述
}
```

---

## Interfaces

### sql-formatter 集成

使用 `sql-formatter` 的 `format()` API：

```typescript
import { format } from 'sql-formatter';

const formatted = format(sql, {
  language: config.dialect,       // 'postgresql' | 'mysql' | 'sqlite'
  tabWidth: config.indentWidth,   // 2 | 4
  keywordCase: 'upper',           // 关键字统一大写
});
```

### highlight.js 集成

```typescript
import hljs from 'highlight.js/lib/core';
import sql from 'highlight.js/lib/languages/sql';

hljs.registerLanguage('sql', sql);

const result = hljs.highlight(formattedSql, { language: 'sql' });
// result.value 为带 <span class="hljs-*"> 标签的 HTML 字符串
```

### Clipboard API

```typescript
await navigator.clipboard.writeText(plainText);
```

---

## IN 子句后处理算法

`sql-formatter` 默认将 IN 子句的每个值单独一行，需要后处理将其按 `valuesPerLine` 分组。

**算法思路**：

1. 使用正则表达式匹配 IN 子句块：`/\bIN\s*\(([^)]+)\)/gi`
2. 对每个匹配块，提取括号内的值列表（按逗号分割，去除空白）
3. 将值按 `valuesPerLine` 分组，每组用 `, ` 连接，组间换行并对齐缩进
4. 替换原始匹配内容

```typescript
function postProcessInClauses(sql: string, valuesPerLine: number): string {
  return sql.replace(/\bIN\s*\(([^)]*)\)/gi, (match, inner) => {
    const values = inner.split(',').map((v: string) => v.trim()).filter(Boolean);
    if (values.length <= valuesPerLine) return match;
    const groups: string[] = [];
    for (let i = 0; i < values.length; i += valuesPerLine) {
      groups.push(values.slice(i, i + valuesPerLine).join(', '));
    }
    const indent = '    '; // 与 IN 子句对齐
    return `IN (\n${groups.map(g => indent + g).join(',\n')}\n)`;
  });
}
```

---

## Error Handling

| 场景 | 处理方式 |
|------|----------|
| SQL 解析失败（sql-formatter 抛出异常） | 捕获异常，PreviewPanel 展示原始文本 + 内联错误提示 |
| 剪贴板写入失败（权限拒绝等） | 捕获 Promise rejection，CopyButton 展示错误提示 |
| IN 子句正则匹配异常 | try/catch 包裹，降级返回未处理的格式化文本 |
| 输入为空 | 跳过格式化，PreviewPanel 展示占位符 |

---

## Layout & Responsive Design

```
┌──────────────────────────────────────────────────────────┐
│  SQL Formatter                          [Config Panel]   │
├─────────────────────────┬────────────────────────────────┤
│                         │                    [Copy]      │
│   Input Panel           │   Preview Panel               │
│   <textarea>            │   <div> (hljs output)         │
│                         │                               │
│   (独立滚动)             │   (独立滚动)                   │
└─────────────────────────┴────────────────────────────────┘
         viewport >= 768px: 左右分屏（各 50%）
         viewport < 768px:  上下堆叠（Input 在上）
```

CSS 实现：
```css
.app-layout {
  display: flex;
  height: 100vh;
}

.panel {
  flex: 1;
  overflow-y: auto;
}

@media (max-width: 767px) {
  .app-layout {
    flex-direction: column;
  }
}
```

---

## Performance Considerations

1. **Debounce**：InputPanel 的 `input` 事件经 300ms debounce 后触发格式化，避免高频计算。
2. **同步执行**：`sql-formatter` 和 `highlight.js` 均为同步 API，对于 ≤50,000 字符的输入，在现代浏览器中可在 500ms 内完成。若未来需要支持更大输入，可考虑将格式化移入 Web Worker。
3. **内存管理**：InputPanel 清空后，AppController 不缓存历史 SQL 文本，PreviewPanel 的 innerHTML 被清空，避免内存泄漏。
4. **按需加载 highlight.js**：仅注册 SQL 语言包，不加载全量语言包，减小 bundle 体积。

---

## Project Structure

```
sqlFormatter/
├── index.html
├── vite.config.ts
├── package.json
├── tsconfig.json
└── src/
    ├── main.ts                  # 入口，初始化 AppController
    ├── controller/
    │   └── AppController.ts
    ├── formatter/
    │   └── Formatter.ts
    ├── highlighter/
    │   └── Highlighter.ts
    ├── ui/
    │   ├── InputPanel.ts
    │   ├── PreviewPanel.ts
    │   ├── ConfigPanel.ts
    │   └── CopyButton.ts
    ├── types/
    │   └── index.ts             # FormatterConfig, SqlDialect, FormatResult
    └── styles/
        ├── main.css             # 布局与基础样式
        └── highlight-theme.css  # highlight.js 暗色主题（WCAG AA）
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: 格式化响应时间

*For any* SQL input up to 50,000 characters and any valid `FormatterConfig`, calling `Formatter.format()` followed by `Highlighter.highlight()` SHALL complete within 500ms.

**Validates: Requirements 9.1, 2.1**

---

### Property 2: 无效 SQL 降级展示

*For any* string that causes `sql-formatter` to throw an exception, `Formatter.format()` SHALL return a `FormatResult` with the original input text preserved in `text` and a non-empty `error` field, never propagating the exception to the caller.

**Validates: Requirements 2.3**

---

### Property 3: 高亮输出保留原始文本

*For any* formatted SQL string, stripping all HTML tags from `Highlighter.highlight()` output SHALL yield a string equal to the original formatted SQL input (whitespace-normalized).

**Validates: Requirements 3.2**

---

### Property 4: 语法高亮覆盖所有 Token 类别

*For any* SQL string containing at least one keyword, one string literal, and one numeric literal, the HTML output of `Highlighter.highlight()` SHALL contain `<span>` elements with `hljs-keyword`, `hljs-string`, and `hljs-number` CSS classes respectively.

**Validates: Requirements 3.1, 3.3**

---

### Property 5: 缩进宽度一致性

*For any* SQL input and any indentation width `w ∈ {2, 4}`, every indented line in the output of `Formatter.format()` SHALL use exactly `w` spaces per indentation level, with no mixing of indentation widths within the same output.

**Validates: Requirements 4.1, 4.5**

---

### Property 6: 多语句空行分隔

*For any* SQL script containing N ≥ 2 statements separated by semicolons, the formatted output SHALL contain exactly N−1 blank lines between consecutive statements, each statement SHALL end with a semicolon, and the output SHALL not end with a blank line.

**Validates: Requirements 5.1, 5.2, 5.3**

---

### Property 7: IN 子句值分组

*For any* SQL containing one or more IN clauses (including those in subqueries) and any `valuesPerLine` value `n ∈ [1, 100]`, the formatted output SHALL group the values of each IN clause into rows of exactly `n` values, with the final row containing the remainder (1 to n values) and no padding.

**Validates: Requirements 6.2, 6.3, 6.5**

---

### Property 8: 复制内容不含 HTML 标签

*For any* state of the Preview Panel, the text written to the clipboard by `CopyButton` SHALL equal `PreviewPanel.getPlainText()`, which SHALL contain no HTML tags (i.e., no `<` or `>` characters from markup).

**Validates: Requirements 8.2**

---

### Property 9: 配置变更立即触发重新格式化

*For any* SQL input and any change to `FormatterConfig` (dialect, indentWidth, or valuesPerLine), the Preview Panel SHALL be updated with a newly formatted result reflecting the new configuration within 300ms of the config change event.

**Validates: Requirements 4.5, 6.4, 7.2**
