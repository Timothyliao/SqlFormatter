# Vue 迁移需求文档

## 迁移目标

将 SQL Formatter 从原生 TypeScript + 手写 DOM 架构一次性迁移至 Vue 3 + Composition API + `<script setup>`，保持所有现有功能不变。

---

## 功能需求

### REQ-1：格式化核心功能保持不变
- SQL 格式化（方言、缩进、关键字大小写、逗号位置、IN 分组）行为与迁移前完全一致
- 格式化防抖 250ms，配置变更立即触发重新格式化
- 格式化失败时展示错误提示，同时显示原始 SQL

### REQ-2：文档管理功能保持不变
- 最多 5 个文档 tab，支持新建、删除、重命名
- 切换 tab 前自动保存当前文档内容
- 文档内容持久化到 localStorage，刷新后恢复
- 未保存状态显示脏标记（小圆点）

### REQ-3：编辑器功能保持不变
- CodeMirror 6 编辑器，支持 SQL 语法高亮、行号、括号匹配
- 主题热替换（暗黑/明亮），不重建编辑器实例
- 字体大小通过 CSS 变量 `--editor-font-size` 控制

### REQ-4：预览面板功能保持不变
- 语法高亮展示格式化结果
- 行号 gutter
- 多语句折叠/展开（Ctrl+Shift+[ / ]）
- 一键复制格式化结果

### REQ-5：主题切换功能保持不变
- 暗黑/明亮主题切换，持久化到 localStorage
- 主题通过 `data-theme` attribute 控制，CSS 变量响应

### REQ-6：Fun 模式功能保持不变
- EvolutionWidget 拖拽吸附、进化等级、tooltip
- EasterEgg 检测与触发（8 种彩蛋）
- EggBook 彩蛋图鉴弹窗

### REQ-7：快捷键保持不变
- Ctrl+S：保存当前文档
- Ctrl+Shift+[：折叠全部语句
- Ctrl+Shift+]：展开全部语句

### REQ-8：拖拽分隔线功能保持不变
- 左右面板可拖拽调整宽度（20%~80%）
- 键盘方向键微调（每次 2%）
- 移动端（< 768px）禁用

---

## 非功能需求

### REQ-9：构建与测试
- `npm run build` 零编译错误
- `npm run test` 全部通过
- 构建产物体积不超过迁移前的 120%

### REQ-10：代码规范
- 全程 TypeScript 严格模式，不使用 `any`
- 所有 Vue 组件使用 `<script setup>` 语法
- 状态管理统一使用 Pinia，不在组件内直接操作 localStorage

---

## 验收标准

1. 所有 REQ-1 至 REQ-8 的功能在浏览器中手动验证通过
2. `npm run build` 无错误
3. `npm run test -- --run` 全部通过
4. 原有 CSS 样式视觉效果与迁移前一致
