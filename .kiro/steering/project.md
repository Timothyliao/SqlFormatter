# SQL Formatter — 项目概览

## 项目定位

纯前端 SQL 格式化工具，零服务器依赖，SQL 数据不离开浏览器。基于 Vite + TypeScript 构建，无 UI 框架。

当前版本：**v1.2.0**

---

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Vite | 4.5.3 | 构建工具 |
| TypeScript | 5.4.5 | 语言 |
| CodeMirror 6 | latest | 左侧 SQL 编辑器 |
| sql-formatter | 15.4.2 | SQL 格式化核心库 |
| highlight.js | 11.9.0 | 右侧语法高亮 |
| Vitest | 0.34.6 | 单元测试 |

---

## 目录结构

```
src/
  main.ts                  # 入口，实例化所有组件并连线
  types/index.ts           # 所有类型定义和常量
  controller/
    AppController.ts       # 核心协调器，管理格式化流水线、历史、字体大小
  formatter/
    Formatter.ts           # 封装 sql-formatter，含后处理（逗号位置、IN分组）
  highlighter/
    Highlighter.ts         # 封装 highlight.js，SQL 语法高亮
  ui/
    InputPanel.ts          # CodeMirror 6 编辑器，支持主题热替换（Compartment）
    PreviewPanel.ts        # 格式化结果展示，含行号 gutter
    ConfigPanel.ts         # 顶部配置栏（方言/缩进/关键字/逗号/间距/IN值数/字体大小）
    CopyButton.ts          # 一键复制格式化结果
    ResizableDivider.ts    # 左右面板拖拽分隔线
    ThemeToggle.ts         # 暗黑/明亮主题切换（checkbox switch，图标在滑块内）
    HistoryPanel.ts        # 历史记录（最多3条，支持重命名/删除/恢复）
  styles/
    main.css               # 主样式，CSS 变量双主题（dark/light）
    highlight-theme.css    # highlight.js 语法高亮颜色，CSS 变量驱动
index.html                 # HTML 入口
tests/                     # Vitest 单元测试
docs/
  product.md               # 产品文档
  dev-log.md               # 开发记录
```

---

## 数据流

```
用户输入 SQL
  → InputPanel.onChange()（防抖 250ms）
  → AppController.runPipeline()
  → Formatter.format(sql, config)  →  FormatResult { text, error? }
  → Highlighter.highlight(text)    →  HTML string
  → PreviewPanel.setContent(html)
  → HistoryPanel.push(sql)         （仅成功格式化，且非历史恢复时）
```

---

## 关键设计约定

- **单向数据流**：UI 组件只负责渲染和事件，AppController 负责所有协调逻辑
- **接口稳定**：InputPanel / PreviewPanel / ConfigPanel 对外暴露最小接口，AppController 不感知内部实现
- **CSS 变量双主题**：所有颜色通过 `--color-*` 变量定义，`[data-theme='dark']` / `[data-theme='light']` 切换
- **CodeMirror 主题热替换**：使用 `Compartment` 动态替换主题扩展，不重建编辑器实例
- **历史去重**：`HistoryPanel.push()` 先过滤同内容旧条目再插入队首；`AppController` 用 `restoringFromHistory` 标志位防止恢复时触发新的历史写入
- **字体大小**：通过 CSS 自定义属性 `--editor-font-size` 传递，编辑器和预览区共享

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
