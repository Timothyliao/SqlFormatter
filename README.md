# 🧹 SQL Formatter

> 你正在被日志里的杂乱 SQL 折磨吗？  
> 你正在被冗长难读的 SQL 语句折磨吗？  
> **试试这款 SQL 格式化器吧 —— 完全本地运行，SQL 数据永不离开你的浏览器。**

全程由 AI 开发 🤖，零服务器依赖，粘贴即用。

---

## ✨ 功能亮点

| 功能 | 说明 |
|------|------|
| ⚡ 实时格式化 | 输入即格式化，防抖延迟 ≤ 300ms |
| 🎨 语法高亮 | 关键字、字符串、数字、注释分色显示 |
| 🗄️ 多 SQL 方言 | 支持 PostgreSQL、MySQL、SQLite |
| ✏️ CodeMirror 编辑器 | 行号、括号匹配、撤销/重做 |
| 🔧 丰富配置项 | 缩进、关键字大小写、逗号位置、语句间距、IN 子句分组 |
| 🌗 深色/浅色主题 | 一键切换，护眼模式随时开启 |
| 📋 一键复制 | 复制纯文本结果，无多余 HTML 标签 |
| 💾 历史记录 | 自动保存最近 3 条格式化记录，支持重命名/恢复/删除 |
| ↔️ 可拖拽分屏 | 自由调整左右面板宽度 |
| 📱 响应式布局 | 桌面左右分屏，移动端自动上下堆叠 |
| 🔒 完全本地 | 零网络请求，SQL 数据不上传任何服务器 |

---

## 🚀 快速开始

### 环境要求

- Node.js ≥ 16
- npm ≥ 7

### 安装 & 启动

```bash
npm install
npm run dev
```

浏览器访问 `http://localhost:5173`，粘贴你的 SQL，立刻看到效果。

### 构建生产版本

```bash
npm run build
```

产物输出到 `dist/`，可直接部署到 Nginx、GitHub Pages、Vercel 等任意静态托管平台。

---

## 🖥️ 使用方式

1. 在左侧编辑器粘贴或输入原始 SQL（支持多条语句）
2. 右侧实时显示格式化 + 语法高亮结果
3. 通过顶部配置栏按需调整格式化选项：

| 配置项 | 可选值 |
|--------|--------|
| 方言 | PostgreSQL / MySQL / SQLite |
| 缩进 | 2 空格 / 4 空格 |
| 关键字 | 大写 / 小写 / 保留原样 |
| 逗号位置 | 行尾 / 行首 |
| 语句间距 | 1 行 / 2 行 |
| IN 每行值数 | 1–100 |

4. 拖拽中间分隔线调整面板宽度（也可用方向键微调）
5. 点击「复制」按钮，将格式化结果复制到剪贴板

---

## 🏗️ 技术栈

| 类别 | 技术 |
|------|------|
| 构建工具 | [Vite](https://vitejs.dev/) 4.5 |
| 语言 | TypeScript 5.4 |
| 代码编辑器 | [CodeMirror](https://codemirror.net/) 6 |
| SQL 格式化 | [sql-formatter](https://github.com/sql-formatter-org/sql-formatter) 15.4 |
| 语法高亮 | [highlight.js](https://highlightjs.org/) 11.9 |
| 测试框架 | [Vitest](https://vitest.dev/) 0.34 |
| UI 框架 | 无（原生 DOM） |

---

## 📁 项目结构

```
src/
├── main.ts                  # 应用入口
├── controller/
│   └── AppController.ts     # 核心协调器
├── formatter/
│   └── Formatter.ts         # SQL 格式化（基于 sql-formatter）
├── highlighter/
│   └── Highlighter.ts       # 语法高亮（基于 highlight.js）
├── ui/
│   ├── InputPanel.ts        # 左侧编辑器
│   ├── PreviewPanel.ts      # 右侧预览
│   ├── ConfigPanel.ts       # 顶部配置栏
│   ├── HistoryPanel.ts      # 历史记录面板
│   ├── ThemeToggle.ts       # 主题切换
│   ├── CopyButton.ts        # 复制按钮
│   └── ResizableDivider.ts  # 可拖拽分隔线
└── styles/
    ├── main.css             # 布局与主题变量
    └── highlight-theme.css  # 语法高亮配色
```

---

## 🧪 运行测试

```bash
npm run test -- --run
```

测试覆盖：格式化核心逻辑、语法高亮、AppController 流水线、PreviewPanel 复制、端到端集成。

---

## License

MIT
