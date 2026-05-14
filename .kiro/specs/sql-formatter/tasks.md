# Implementation Plan: SQL Formatter

## Overview

基于 Vite + TypeScript 构建纯前端 SQL 格式化工具。实现顺序：项目脚手架 → 类型定义 → 核心格式化/高亮模块 → UI 组件 → AppController 串联 → 样式与响应式布局 → 复制功能 → 集成测试。

## Tasks

- [x] 1. 初始化项目结构与依赖
  - 创建 `package.json`，添加 `vite`、`typescript`、`sql-formatter`、`highlight.js` 依赖
  - 创建 `vite.config.ts`、`tsconfig.json`
  - 创建 `index.html` 入口页面，包含 `.app-layout` 骨架 DOM
  - 创建 `src/` 目录结构：`controller/`、`formatter/`、`highlighter/`、`ui/`、`types/`、`styles/`
  - _Requirements: 10.1_

- [x] 2. 定义核心类型与接口
  - [x] 2.1 创建 `src/types/index.ts`
    - 定义 `SqlDialect`、`FormatterConfig`、`FormatResult` 类型
    - _Requirements: 4.4, 6.1, 7.1_

- [x] 3. 实现 Formatter 模块
  - [x] 3.1 创建 `src/formatter/Formatter.ts`
    - 集成 `sql-formatter` 的 `format()` API，传入 `language`、`tabWidth`、`keywordCase: 'upper'`
    - 实现 `postProcessStatements()`：多语句间插入恰好一个空行，去除尾部空行
    - 实现 `postProcessInClauses()`：按 `valuesPerLine` 对 IN 子句值分组换行
    - 实现 `format()` 方法，捕获所有异常，返回 `FormatResult`（异常时保留原始文本并填充 `error`）
    - _Requirements: 2.3, 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 6.2, 6.3, 6.5, 7.3_

  - [x] 3.2 为 Formatter 编写属性测试
    - **Property 2: 无效 SQL 降级展示** ✓
    - **Property 5: 缩进宽度一致性** ✓
    - **Property 6: 多语句空行分隔** ✓
    - **Property 7: IN 子句值分组** ✓

- [x] 4. 实现 Highlighter 模块
  - [x] 4.1 创建 `src/highlighter/Highlighter.ts`
    - 按需注册 `highlight.js` SQL 语言包（不加载全量包）
    - 实现 `highlight(formattedSql, dialect)` 方法，调用 `hljs.highlight()` 返回 HTML 字符串
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 4.2 为 Highlighter 编写属性测试
    - **Property 3: 高亮输出保留原始文本** ✓
    - **Property 4: 语法高亮覆盖所有 Token 类别** ✓

- [x] 5. 实现 UI 组件
  - [x] 5.1 创建 `src/ui/InputPanel.ts`
    - 封装 `<textarea>` 元素，实现 `getValue()`、`setValue()`、`onChange()` 方法
    - _Requirements: 2.1, 2.4_

  - [x] 5.2 创建 `src/ui/PreviewPanel.ts`
    - 实现 `setContent(html)`、`setPlaceholder()`、`setError(message)`、`getPlainText()` 方法
    - `getPlainText()` 通过 `textContent` 获取纯文本，确保不含 HTML 标签
    - _Requirements: 2.2, 2.3, 3.2, 8.2_

  - [x] 5.3 创建 `src/ui/ConfigPanel.ts`
    - 实现方言 `<select>`（PostgreSQL / MySQL / SQLite，默认 PostgreSQL）
    - 实现缩进宽度 `<select>`（2 / 4，默认 2）
    - 实现每行值数量 `<input type="number">`（范围 1–100，默认 3）
    - 实现 `getConfig()` 和 `onConfigChange()` 方法
    - _Requirements: 4.4, 6.1, 7.1_

  - [x] 5.4 创建 `src/ui/CopyButton.ts`
    - 调用 `navigator.clipboard.writeText()` 写入剪贴板
    - 成功后显示确认提示 1–3 秒后恢复默认状态
    - 失败后显示内联错误提示
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 5.5 为 PreviewPanel.getPlainText() 编写属性测试
    - **Property 8: 复制内容不含 HTML 标签** ✓

- [x] 6. Checkpoint — 所有核心模块已实现，TypeScript 类型检查通过

- [x] 7. 实现 AppController
  - [x] 7.1 创建 `src/controller/AppController.ts`
    - 构造函数注入 `InputPanel`、`PreviewPanel`、`ConfigPanel`、`Formatter`、`Highlighter`
    - 实现 `init()` 方法：绑定 InputPanel `onChange`（debounce ≤300ms）和 ConfigPanel `onConfigChange`（立即触发）
    - 实现 `runPipeline()`：调用 `Formatter.format()` → `Highlighter.highlight()` → `PreviewPanel.setContent()`；空输入时调用 `setPlaceholder()`；有错误时调用 `setError()`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 4.5, 6.4, 7.2_

  - [x] 7.2 为 AppController 编写属性测试
    - **Property 1: 格式化响应时间** ✓
    - **Property 9: 配置变更立即触发重新格式化** ✓

- [x] 8. 创建入口文件与样式
  - [x] 8.1 创建 `src/main.ts`
    - 实例化所有组件，创建 `AppController` 并调用 `init()`
    - _Requirements: 10.1_

  - [x] 8.2 创建 `src/styles/main.css`
    - 实现 `.app-layout` flex 布局（`height: 100vh`，左右各 50%，独立滚动）
    - 实现响应式断点：`@media (max-width: 767px)` 切换为上下堆叠布局
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 8.3 创建 `src/styles/highlight-theme.css`
    - 引入或自定义 highlight.js 暗色主题，确保对比度满足 WCAG AA（≥4.5:1）
    - _Requirements: 3.4_

- [x] 9. 验证构建产物
  - [x] 9.1 运行 `vite build`，确认 `dist/` 目录生成正确的 HTML、CSS、JS 资源
    - 检查产物中无硬编码绝对路径 ✓（所有资源使用 `./assets/` 相对路径）
    - _Requirements: 10.1, 10.2_

  - [x] 9.2 编写集成测试 ✓
    - 完整格式化流水线（InputPanel → AppController → Formatter → Highlighter → PreviewPanel）
    - 复制功能（CopyButton → PreviewPanel.getPlainText() → clipboard）

- [x] 10. Final Checkpoint — 构建成功，dist/ 产物验证通过

## Notes

- 标有 `*` 的子任务为可选项，已跳过以加快 MVP 交付
- 每个任务均引用具体需求条款，确保可追溯性
- `sql-formatter` 和 `highlight.js` 均为同步 API，无需 Web Worker（≤50,000 字符场景）
- 按需加载 highlight.js SQL 语言包，减小 bundle 体积
- Node 16 兼容：使用 Vite 4.5.3（Vite 5 需要 Node ≥18）

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1"] },
    { "id": 1, "tasks": ["3.1", "4.1"] },
    { "id": 2, "tasks": ["5.1", "5.2", "5.3"] },
    { "id": 3, "tasks": ["5.4", "7.1"] },
    { "id": 4, "tasks": ["8.1", "8.2", "8.3"] },
    { "id": 5, "tasks": ["9.1"] }
  ]
}
```
