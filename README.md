# SQL Formatter

一个纯前端、零服务器依赖的 SQL 格式化工具。在浏览器中实时格式化 SQL，支持 CodeMirror 编辑器、语法高亮、多方言、丰富格式化配置，以及可拖拽分屏布局。

## 功能特性

- **CodeMirror 编辑器** — 行号、括号匹配、SQL 语法高亮、撤销/重做，替代普通文本框
- **实时格式化** — 输入即格式化，防抖延迟 ≤ 300ms
- **语法高亮预览** — 基于 highlight.js，关键字、字符串、数字、注释分色显示，满足 WCAG AA 对比度标准
- **多 SQL 方言** — 支持 PostgreSQL（默认）、MySQL、SQLite
- **关键字大小写** — 可选大写 / 小写 / 保留原样
- **逗号位置** — 可选行尾逗号（默认）或行首逗号
- **语句间距** — 多条语句之间插入 1 或 2 个空行
- **灵活缩进** — 可选 2 或 4 空格缩进
- **IN 子句分组** — 自定义每行显示的值数量（1–100）
- **可拖拽分屏** — 鼠标拖拽调整左右面板宽度（20%–80%），支持键盘微调
- **一键复制** — 复制纯文本格式化结果到剪贴板，无 HTML 标签
- **响应式布局** — 桌面端左右分屏，移动端自动切换为上下堆叠
- **纯静态部署** — 构建产物为静态文件，可部署到任意静态托管平台

## 快速开始

### 环境要求

- Node.js ≥ 16
- npm ≥ 7

### 安装依赖

```bash
npm install
```

### 本地开发

```bash
npm run dev
```

浏览器访问 `http://localhost:5173`

### 构建生产版本

```bash
npm run build
```

构建产物输出到 `dist/` 目录，可直接部署到任意静态托管服务（Nginx、GitHub Pages、Vercel 等）。

### 预览构建产物

```bash
npm run preview
```

### 运行测试

```bash
npm test
```

## 使用说明

1. 在左侧 CodeMirror 编辑器中粘贴或输入原始 SQL
2. 右侧实时显示格式化后的带语法高亮结果
3. 通过顶部配置栏调整格式化选项：

| 配置项 | 说明 |
|--------|------|
| 方言 | PostgreSQL / MySQL / SQLite |
| 缩进 | 2 或 4 空格 |
| 关键字 | 大写 / 小写 / 保留 |
| 逗号 | 行尾 / 行首 |
| 语句间距 | 1 行 / 2 行 |
| IN 每行值数 | 1–100，控制 IN 子句换行粒度 |

4. 拖拽中间分隔线调整左右面板宽度（也可用方向键微调）
5. 点击右侧面板顶部的「复制」按钮，将格式化结果复制到剪贴板

## 项目结构

```
sqlFormatter/
├── index.html                   # 页面入口
├── vite.config.ts               # Vite 构建配置
├── tsconfig.json                # TypeScript 配置
├── package.json
└── src/
    ├── main.ts                  # 应用入口，初始化所有组件
    ├── controller/
    │   └── AppController.ts     # 核心协调器，串联格式化流水线
    ├── formatter/
    │   └── Formatter.ts         # SQL 格式化模块（基于 sql-formatter）
    ├── highlighter/
    │   └── Highlighter.ts       # 语法高亮模块（基于 highlight.js）
    ├── ui/
    │   ├── InputPanel.ts        # 左侧 CodeMirror 编辑器面板
    │   ├── PreviewPanel.ts      # 右侧预览面板
    │   ├── ConfigPanel.ts       # 顶部配置面板
    │   ├── CopyButton.ts        # 复制按钮组件
    │   └── ResizableDivider.ts  # 可拖拽分隔线
    ├── types/
    │   └── index.ts             # 类型定义（FormatterConfig、SqlDialect 等）
    └── styles/
        ├── main.css             # 布局与基础样式
        └── highlight-theme.css  # 语法高亮暗色主题（Catppuccin Mocha）
```

## 技术栈

| 类别 | 技术 |
|------|------|
| 构建工具 | [Vite](https://vitejs.dev/) 4.5 |
| 语言 | TypeScript 5.4 |
| 代码编辑器 | [CodeMirror](https://codemirror.net/) 6 |
| SQL 格式化 | [sql-formatter](https://github.com/sql-formatter-org/sql-formatter) 15.4 |
| 语法高亮 | [highlight.js](https://highlightjs.org/) 11.9 |
| 测试框架 | [Vitest](https://vitest.dev/) 0.34 |
| UI 框架 | 无（原生 DOM） |

## 开发说明

### 架构概览

应用采用单向数据流，分三层：

```
UI Layer (InputPanel / ConfigPanel / PreviewPanel / CopyButton / ResizableDivider)
         ↓ events
Controller Layer (AppController — debounce + 流水线编排)
         ↓
Core Layer (Formatter → Highlighter)
```

### 添加新方言

1. 在 `src/types/index.ts` 的 `SqlDialect` 类型中添加新方言值
2. 在 `src/ui/ConfigPanel.ts` 的 `dialects` 数组中添加对应选项
3. 确认 `sql-formatter` 支持该方言（参考其[文档](https://sql-formatter-org.github.io/sql-formatter/)）

### 测试

测试文件位于 `tests/` 目录，覆盖以下场景：

- `formatter.test.ts` — Formatter 属性测试（缩进一致性、多语句分隔、IN 子句分组、错误降级、关键字大小写、逗号位置）
- `highlighter.test.ts` — Highlighter 属性测试（输出保留原文、Token 类别覆盖）
- `app-controller.test.ts` — AppController 集成测试（响应时间、配置变更触发重格式化）
- `preview-panel.test.ts` — PreviewPanel 单元测试（复制内容不含 HTML 标签）
- `integration.test.ts` — 端到端流水线测试（含新配置项验证）

## License

MIT
