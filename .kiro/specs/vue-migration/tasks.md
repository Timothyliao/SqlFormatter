# Vue 迁移任务列表

## 任务概览

按依赖顺序分为 6 个阶段，每个阶段完成后运行构建和测试验证。

---

## Phase 1：项目脚手架与依赖配置

- [ ] 1. 安装 Vue 3、Pinia、@vitejs/plugin-vue、@vueuse/core、@vue/test-utils
  - 更新 `package.json` 添加新依赖
  - 运行 `npm install`
  - **验收**：`node_modules` 中存在 `vue`、`pinia`、`@vueuse/core`

- [ ] 2. 配置 Vite 支持 Vue
  - 修改 `vite.config.ts`，添加 `@vitejs/plugin-vue` 插件
  - **验收**：`npm run build` 不报 Vue 相关错误

- [ ] 3. 配置 TypeScript 支持 Vue SFC
  - 修改 `tsconfig.json`，添加 Vue 类型支持
  - 新增 `src/env.d.ts`，声明 `*.vue` 模块类型
  - **验收**：TypeScript 不报 `.vue` 文件类型错误

- [ ] 4. 简化 `index.html`
  - 移除所有手动 DOM 挂载点（`id="input-panel"` 等）
  - 保留单一 `<div id="app">`
  - 保留两个 CSS 引用
  - **验收**：HTML 结构简洁，无冗余 id

---

## Phase 2：Pinia Stores

- [ ] 5. 创建 `src/stores/themeStore.ts`
  - 使用 `useLocalStorage` 持久化主题
  - `watch` 主题变化，同步写入 `document.documentElement.setAttribute('data-theme', ...)`
  - **验收**：store 可独立实例化，主题切换后 `data-theme` 正确更新

- [ ] 6. 创建 `src/stores/uiStore.ts`
  - 使用 `useLocalStorage` 持久化字体大小
  - `watch` 字体大小变化，同步写入 `--editor-font-size` CSS 变量
  - 包含 `leftPanelPct` ref（面板宽度比例）
  - **验收**：字体大小变化后 CSS 变量正确更新

- [ ] 7. 创建 `src/stores/formatterStore.ts`
  - 包含 `sql`、`config`、`outputHtml`、`errorMessage`、`isRestoringFromHistory`
  - 使用 `watchDebounced([sql, config], pipeline, { debounce: 250, deep: true })`
  - pipeline 内调用 `Formatter.format()` + `Highlighter.highlight()`
  - `isRestoringFromHistory` 为 true 时跳过 `historyStore.markDirty()`
  - **验收**：修改 `sql` 后 250ms 内 `outputHtml` 更新

- [ ] 8. 创建 `src/stores/historyStore.ts`
  - 包含 `docs`、`activeId`、`dirtyId`、`docCounter`
  - 实现 `switchTo(id, flushFn)`：先调用 `flushFn()` 保存，再切换，用 `nextTick` 包裹 `isRestoringFromHistory` 标志
  - 实现 `saveActiveDoc(sql)`、`markDirty()`、`newDocument()`、`deleteDoc(id)`、`renameDoc(id, label)`
  - localStorage 持久化（STORAGE_KEY、ACTIVE_KEY、COUNTER_KEY 与原实现一致）
  - **验收**：切换文档时序正确，不触发多余历史写入

- [ ] 9. 更新 `src/stores/formatterStore.ts`，集成 historyStore
  - `watchDebounced` 回调中，若 `!isRestoringFromHistory.value`，调用 `historyStore.markDirty()`
  - 添加 save debounce（1000ms）：`watchDebounced(sql, () => historyStore.saveActiveDoc(sql.value), { debounce: 1000 })`
  - **验收**：编辑 SQL 后 1s 自动保存，切换 tab 不触发脏标记

---

## Phase 3：纯函数提取与工具层

- [ ] 10. 创建 `src/utils/previewParser.ts`
  - 从 `PreviewPanel.ts` 提取：`parseBlocks`、`buildGutterRows`、`buildCodeHtml`、`escapeHtml`、`unescapeHtml`、`StatementBlock` 接口
  - 所有函数为纯函数，无 DOM 依赖
  - **验收**：原有 `preview-panel.test.ts` 的测试逻辑可迁移至此文件的单元测试

- [ ] 11. 创建 `src/utils/sqlCap.ts`
  - 从 `HistoryPanel.ts` 提取 `capSql` 函数
  - **验收**：函数独立可测试

- [ ] 12. 迁移测试文件
  - 将 `tests/formatter.test.ts` 和 `tests/highlighter.test.ts` 直接复用（路径不变）
  - 新建 `tests/previewParser.test.ts`，迁移原 `preview-panel.test.ts` 的解析逻辑测试
  - 新建 `tests/formatterStore.test.ts`，测试 pipeline 触发逻辑
  - 新建 `tests/historyStore.test.ts`，测试文档切换时序
  - 删除 `tests/app-controller.test.ts`（逻辑已分散到 store 测试）
  - **验收**：`npm run test -- --run` 全部通过

---

## Phase 4：Vue 组件实现

- [ ] 13. 创建 `src/main.ts`（Vue 版本）
  - `createApp(App).use(createPinia()).mount('#app')`
  - **验收**：页面可渲染，无控制台错误

- [ ] 14. 创建 `src/App.vue`
  - 整体布局骨架（header、history-bar、main layout）
  - 注册全局快捷键（`useEventListener`）：Ctrl+S、Ctrl+Shift+[、Ctrl+Shift+]
  - 通过 `ref` 持有 `PreviewPanel` 实例，调用 `foldAll`/`unfoldAll`
  - **验收**：布局与原 `index.html` 视觉一致

- [ ] 15. 创建 `src/components/ThemeToggle.vue`
  - pill-shaped checkbox switch，图标在滑块内（月亮/太阳）
  - 绑定 `themeStore.theme`
  - **验收**：切换后 `data-theme` 变化，CodeMirror 主题同步更新

- [ ] 16. 创建 `src/components/ConfigPanel.vue`
  - header 内方言选择（立即触发 `formatterStore.config.dialect` 更新）
  - 设置按钮打开弹窗（`v-show` + CSS transition）
  - 弹窗内所有控件绑定 `pendingConfig` 本地 ref
  - 点击"应用"：写入 `formatterStore.config` + `uiStore.fontSize`，关闭弹窗
  - Escape 键关闭弹窗
  - localStorage 持久化（`useLocalStorage` 或 `watch` + 手动写入）
  - **验收**：配置变更后格式化结果立即更新

- [ ] 17. 创建 `src/components/InputPanel.vue`
  - `onMounted` 创建 CodeMirror `EditorView`，`onUnmounted` 销毁
  - `EditorView.updateListener` 写入 `formatterStore.sql`
  - `watch(formatterStore.sql)` 检测外部写入（历史恢复），同步到编辑器
  - `watch(themeStore.theme)` 用 `Compartment.reconfigure` 热替换主题
  - **验收**：编辑器正常工作，主题切换不重建实例，历史恢复正确加载内容

- [ ] 18. 创建 `src/utils/previewParser.ts` 的 `buildGutterRows` 返回类型定义
  - 确保 `GutterRow` 接口包含 `key`、`lineNum`、`foldable`、`blockIdx`
  - **验收**：TypeScript 无类型错误

- [ ] 19. 创建 `src/components/PreviewPanel.vue`
  - `computed` 调用 `parseBlocks(formatterStore.outputHtml)`
  - `collapsed` ref 数组管理折叠状态
  - gutter 用 `v-for` 渲染，code 区用 `v-html`
  - `defineExpose({ foldAll, unfoldAll, getPlainText })`
  - **验收**：格式化结果正确展示，折叠/展开功能正常

- [ ] 20. 创建 `src/components/CopyButton.vue`
  - 通过 `inject` 或 prop 获取 `PreviewPanel` 的 `getPlainText`
  - 复制成功/失败状态反馈
  - **验收**：复制内容与预览面板文本一致

- [ ] 21. 创建 `src/components/SaveButton.vue`
  - 绑定 `historyStore` 的保存状态（idle/saving/saved/error）
  - 点击触发 `historyStore.saveActiveDoc(formatterStore.sql)`
  - **验收**：保存状态反馈正确

- [ ] 22. 创建 `src/components/HistoryPanel.vue`
  - `v-for` 渲染 tab 列表
  - `renamingId` ref 控制内联重命名 input 显示
  - 点击 tab 调用 `historyStore.switchTo(id, flushFn)`
  - **验收**：tab 切换、新建、删除、重命名功能正常，脏标记正确显示

- [ ] 23. 创建 `src/components/ResizableDivider.vue`
  - 提取 `useResizable` composable（鼠标/触摸/键盘事件）
  - 拖拽结果写入 `uiStore.leftPanelPct`
  - `App.vue` 中用 `:style` 绑定面板宽度
  - **验收**：拖拽调整面板宽度正常，键盘微调正常

---

## Phase 5：Fun 模式组件

- [ ] 24. 创建 `src/composables/useEvoWidget.ts`
  - 提取拖拽吸附逻辑（`initDrag`、`snapToEdge`、`applySnappedPosition`、`loadPosition`、`savePosition`）
  - 拖拽过程直接操作 `el.style`，`mouseup` 时写入 `snapEdge`/`snapOffset` ref（持久化）
  - **验收**：composable 可独立测试拖拽逻辑

- [ ] 25. 创建 `src/components/fun/EvolutionWidget.vue`
  - 使用 `useEvoWidget` composable
  - 消息队列（terminal/toast/tagline）用 `ref` 管理，`watch` 队列变化触发播放
  - `watch(formatterStore.sql)` 触发 `update(sql)`（进化等级计算）
  - `watch(formatterStore.sql)` 触发 `easterEgg.check(sql)`
  - **验收**：进化等级随 SQL 复杂度变化，彩蛋正常触发

- [ ] 26. 创建 `src/components/fun/EggBook.vue`
  - 监听 `open-egg-book` 自定义事件（或通过 `provide/inject` 替代）
  - 展示彩蛋发现进度
  - **验收**：点击 EvolutionWidget 的 ✦ 按钮打开图鉴，发现新彩蛋后实时更新

---

## Phase 6：集成验证与文档更新

- [ ] 27. 端到端功能验证
  - 手动验证所有 REQ-1 至 REQ-8 的功能
  - 验证 localStorage 持久化（刷新后状态恢复）
  - 验证主题切换、字体大小、面板拖拽

- [ ] 28. 运行完整测试套件
  - `npm run build` — 零编译错误
  - `npm run test -- --run` — 全部通过
  - 修复所有失败测试

- [ ] 29. 更新 `docs/dev-log.md`
  - 记录迁移变更文件清单
  - 记录关键设计决策（CodeMirror 集成、store 时序控制）
  - 记录测试结果

- [ ] 30. 更新 `docs/product.md`
  - 更新技术栈章节（新增 Vue 3、Pinia）
  - 版本号更新至 v2.0.0

- [ ] 31. 更新 `.kiro/steering/project.md`
  - 更新目录结构
  - 更新技术栈表格
  - 更新常用命令（如有变化）
  - 新增 Vue 相关开发约定
