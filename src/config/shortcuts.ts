/**
 * Keyboard shortcut definitions.
 *
 * Each entry describes one shortcut with:
 *   - desc:    human-readable description (shown in the shortcuts drawer)
 *   - win:     key labels for Windows / Linux  (array → rendered as <kbd> sequence)
 *   - mac:     key labels for macOS
 *
 * To add a new shortcut:
 *   1. Add the handler in App.vue's keydown listener
 *   2. Add an entry here — the drawer renders it automatically
 */
export interface ShortcutDef {
  desc: string;
  win: string[];
  mac: string[];
}

export const SHORTCUTS: ShortcutDef[] = [
  { desc: '保存当前文档',                         win: ['Ctrl', 'S'],           mac: ['⌘', 'S'] },
  { desc: '复制格式化结果',                       win: ['Ctrl', 'C'],           mac: ['⌘', 'C'] },
  { desc: '折叠全部',                             win: ['Ctrl', 'Shift', '['],  mac: ['⌘', 'Shift', '['] },
  { desc: '展开全部',                             win: ['Ctrl', 'Shift', ']'],  mac: ['⌘', 'Shift', ']'] },
  { desc: '滚动到首行',                           win: ['Ctrl', 'Home'],        mac: ['⌘', '↑'] },
  { desc: '滚动到末尾',                           win: ['Ctrl', 'End'],         mac: ['⌘', '↓'] },
];
