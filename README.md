# ✨ Lumino

> *Paste it. Illuminate it.*

SQL、JSON、StackTrace，粘贴即格式化。全程由 AI 开发 🤖，零服务器依赖，数据永不离开你的浏览器。

---

## ✨ 功能亮点

| 功能 | 说明 |
|------|------|
| ⚡ 实时格式化 | 输入即格式化，防抖延迟 ≤ 300ms |
| 🗄️ 多格式支持 | SQL（PostgreSQL / MySQL / SQLite）、JSON、StackTrace |
| ✏️ CodeMirror 编辑器 | 行号、括号匹配、语法高亮、撤销/重做 |
| 🎨 语法高亮预览 | 关键字、字符串、数字、注释分色显示 |
| 🔧 丰富配置项 | 缩进、关键字大小写、逗号位置、语句间距、IN 子句分组 |
| 📂 多文档管理 | 最多 5 个文档标签，刷新后自动恢复 |
| 🌗 深色/浅色主题 | 自动跟随系统偏好，一键切换，持久化 |
| 📋 一键复制 | 复制纯文本结果，支持 Ctrl+C 快捷键 |
| 💾 自动保存 | 编辑停止 1s 后自动保存，支持 Ctrl+S |
| 🔢 行号 + 语句折叠 | 预览区行号显示，多语句可逐条折叠/展开 |
| ↔️ 可拖拽分屏 | 自由调整左右面板宽度（20%–80%） |
| 📱 响应式布局 | 桌面左右分屏，移动端自动上下堆叠 |
| 👾 SQL 进化论 | 右下角生命体随 SQL 复杂度实时进化，含彩蛋系统 |
| 🔒 完全本地 | 零网络请求，数据不上传任何服务器 |

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

1. 在左侧编辑器粘贴或输入内容（SQL / JSON / StackTrace）
2. 顶部「格式」下拉框选择格式化目标
3. 右侧实时显示格式化 + 语法高亮结果
4. 点击「⚙ 设置」调整格式化选项：

| 配置项 | 可选值 |
|--------|--------|
| 格式 | SQL · PostgreSQL / SQL · MySQL / SQL · SQLite / JSON / StackTrace |
| 缩进 | 2 空格 / 4 空格 |
| 关键字 | 大写 / 小写 / 保留原样 |
| 逗号位置 | 行尾 / 行首 |
| 语句间距 | 1 行 / 2 行 |
| IN 每行值数 | 1–100 |
| 字体大小 | 10–24 px |

5. 拖拽中间分隔线调整面板宽度（也可用方向键微调）
6. 点击「复制」或按 `Ctrl+C`（Mac: `Cmd+C`）复制格式化结果

### 快捷键

| 快捷键 | macOS | 操作 |
|--------|-------|------|
| `Ctrl+S` | `Cmd+S` | 保存当前文档 |
| `Ctrl+C` | `Cmd+C` | 复制格式化结果（无文本选中时） |
| `Ctrl+Shift+[` | `Cmd+Shift+[` | 折叠全部语句 |
| `Ctrl+Shift+]` | `Cmd+Shift+]` | 展开全部语句 |
| `Ctrl+Home` | `Cmd+↑` | 滚动到首行 |
| `Ctrl+End` | `Cmd+↓` | 滚动到末尾 |

---

## 🏗️ 技术栈

| 类别 | 技术 |
|------|------|
| 构建工具 | [Vite](https://vitejs.dev/) 4.5 |
| 语言 | TypeScript 5.4 |
| UI 框架 | [Vue 3](https://vuejs.org/) 3.4|
| 状态管理 | [Pinia](https://pinia.vuejs.org/) 2.1 |
| 工具库 | [@vueuse/core](https://vueuse.org/) 10.9 |
| 代码编辑器 | [CodeMirror](https://codemirror.net/) 6 |
| SQL 格式化 | [sql-formatter](https://github.com/sql-formatter-org/sql-formatter) 15.4 |
| 语法高亮 | [highlight.js](https://highlightjs.org/) 11.9 |
| 测试框架 | [Vitest](https://vitest.dev/) 0.34 |

---

## 📁 项目结构

```
src/
├── main.ts                    # createApp + Pinia 挂载
├── App.vue                    # 根组件，全局快捷键，自动保存
├── stores/
│   ├── formatterStore.ts      # SQL 内容、格式化 pipeline、输出 HTML
│   ├── historyStore.ts        # 多文档管理、localStorage 持久化
│   ├── themeStore.ts          # 主题状态持久化
│   └── uiStore.ts             # 字体大小、面板宽度比例
├── components/
│   ├── ConfigPanel.vue        # 格式选择 + 设置弹窗
│   ├── InputPanel.vue         # CodeMirror 6 编辑器封装
│   ├── PreviewPanel.vue       # 折叠/行号/高亮展示
│   ├── HistoryPanel.vue       # 文档标签栏
│   ├── ThemeToggle.vue        # 主题切换开关
│   ├── CopyButton.vue         # 复制按钮
│   ├── SaveButton.vue         # 保存按钮
│   ├── ResizableDivider.vue   # 可拖拽分隔线
│   └── fun/
│       ├── EvolutionWidget.vue  # SQL 进化论小部件
│       └── EggBook.vue          # 彩蛋图鉴弹窗
├── formatter/
│   └── Formatter.ts           # SQL 格式化（基于 sql-formatter）
├── highlighter/
│   └── Highlighter.ts         # 语法高亮（基于 highlight.js）
├── utils/
│   ├── previewParser.ts       # 纯函数：parseBlocks / buildGutterRows
│   └── sqlCap.ts              # SQL 字节截断
├── fun/
│   ├── EasterEgg.ts           # 彩蛋触发逻辑
│   ├── FunMode.ts             # FunMode 开关
│   ├── SqlComplexity.ts       # SQL 复杂度评分
│   └── ActivityScore.ts       # 活跃度评分
└── styles/
    ├── main.css               # 布局与主题 CSS 变量
    └── highlight-theme.css    # 语法高亮配色
```

---

## 🧪 运行测试

```bash
npm run test -- --run
```

测试覆盖：格式化核心逻辑、语法高亮、previewParser 纯函数、formatterStore pipeline、historyStore 文档管理、端到端集成。

---

## License

MIT
