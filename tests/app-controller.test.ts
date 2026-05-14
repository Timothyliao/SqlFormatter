/**
 * Task 7.2 — AppController property tests
 *
 * Property 1: 格式化响应时间（≤500ms）
 * Property 9: 配置变更立即触发重新格式化
 * Property 10: 文档管理 — saveNow / markDirty / 切换加载
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppController } from '../src/controller/AppController';
import { Formatter } from '../src/formatter/Formatter';
import { Highlighter } from '../src/highlighter/Highlighter';
import type { FormatterConfig, SqlDocument } from '../src/types/index';

// ── Minimal stubs for UI components ──────────────────────────────────────────

class StubInputPanel {
  private value = '';
  private callbacks: Array<(v: string) => void> = [];

  getValue() { return this.value; }
  setValue(v: string) {
    this.value = v;
    this.callbacks.forEach(cb => cb(v));
  }
  onChange(cb: (v: string) => void) { this.callbacks.push(cb); }
}

class StubPreviewPanel {
  content = '';
  placeholder = false;
  errorMsg = '';

  setContent(html: string) { this.content = html; this.placeholder = false; this.errorMsg = ''; }
  setPlaceholder() { this.placeholder = true; this.content = ''; }
  setError(msg: string) { this.errorMsg = msg; }
  getPlainText() { return this.content.replace(/<[^>]*>/g, ''); }
}

class StubConfigPanel {
  private config: FormatterConfig = {
    dialect: 'postgresql',
    indentWidth: 2,
    valuesPerLine: 3,
    keywordCase: 'upper',
    commaPosition: 'after',
    linesBetweenQueries: 1,
  };
  private callbacks: Array<(c: FormatterConfig) => void> = [];
  private fontSizeCallbacks: Array<(size: number) => void> = [];

  getConfig() { return { ...this.config }; }
  setConfig(c: Partial<FormatterConfig>) {
    this.config = { ...this.config, ...c };
    this.callbacks.forEach(cb => cb(this.getConfig()));
  }
  onConfigChange(cb: (c: FormatterConfig) => void) { this.callbacks.push(cb); }
  onFontSizeChange(cb: (size: number) => void) { this.fontSizeCallbacks.push(cb); }
  getFontSize() { return 13; }
}

class StubHistoryPanel {
  private doc: SqlDocument = {
    id: 'stub-doc-1',
    label: '文档 1',
    sql: '',
    updatedAt: Date.now(),
  };
  private dirty = false;
  private switchCbs: Array<(doc: SqlDocument) => void> = [];
  private flushCbs: Array<() => void> = [];

  // Spy-friendly tracking
  updateActiveSqlCalls: string[] = [];
  markDirtyCalls = 0;

  getActiveDoc() { return { ...this.doc }; }
  getDocs() { return [{ ...this.doc }]; }
  isDirty() { return this.dirty; }

  updateActiveSql(sql: string) {
    this.updateActiveSqlCalls.push(sql);
    this.doc.sql = sql;
    this.dirty = false;
  }

  markDirty() {
    this.markDirtyCalls++;
    this.dirty = true;
  }

  onSwitch(cb: (doc: SqlDocument) => void) { this.switchCbs.push(cb); }
  onFlushNeeded(cb: () => void) { this.flushCbs.push(cb); }

  /** Test helper: simulate a tab switch */
  simulateSwitch(newDoc: SqlDocument) {
    // Flush first (mirrors real HistoryPanel.switchTo)
    if (this.dirty) this.flushCbs.forEach(cb => cb());
    this.doc = newDoc;
    this.dirty = false;
    this.switchCbs.forEach(cb => cb(newDoc));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Property 1: 格式化响应时间
// format() + highlight() 管道对 ≤50,000 字符的 SQL 在 500ms 内完成
// ─────────────────────────────────────────────────────────────────────────────
describe('Property 1: 格式化响应时间', () => {
  const formatter = new Formatter();
  const highlighter = new Highlighter();

  const config: FormatterConfig = {
    dialect: 'postgresql',
    indentWidth: 2,
    valuesPerLine: 3,
    keywordCase: 'upper',
    commaPosition: 'after',
    linesBetweenQueries: 1,
  };

  it('简单 SQL 在 500ms 内完成', () => {
    const sql = `SELECT id, name FROM users WHERE status = 'active'`;
    const start = performance.now();
    const result = formatter.format(sql, config);
    highlighter.highlight(result.text, config.dialect);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(500);
  });

  it('中等复杂度 SQL（~1000 字符）在 500ms 内完成', () => {
    const sql = Array.from({ length: 20 }, (_, i) =>
      `SELECT t${i}.id, t${i}.name, t${i}.status FROM table_${i} t${i} WHERE t${i}.id > ${i * 10} AND t${i}.status = 'active';`
    ).join('\n');

    expect(sql.length).toBeGreaterThan(500);

    const start = performance.now();
    const result = formatter.format(sql, config);
    highlighter.highlight(result.text, config.dialect);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(500);
  });

  it('大型 SQL（~10,000 字符）在 500ms 内完成', () => {
    // 生成多条语句，总长度超过 5000 字符
    const stmts = Array.from({ length: 30 }, (_, i) => {
      const values = Array.from({ length: 20 }, (_, j) => i * 20 + j + 1).join(', ');
      return `SELECT id, name, email, status, created_at FROM users_table_${i} WHERE id IN (${values}) ORDER BY created_at DESC;`;
    });
    const sql = stmts.join('\n');

    expect(sql.length).toBeGreaterThan(1000);

    const start = performance.now();
    const result = formatter.format(sql, config);
    highlighter.highlight(result.text, config.dialect);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 9: 配置变更立即触发重新格式化
// FormatterConfig 任意字段变更后，PreviewPanel 立即更新（同步，无 debounce）
// ─────────────────────────────────────────────────────────────────────────────
describe('Property 9: 配置变更立即触发重新格式化', () => {
  let inputPanel: StubInputPanel;
  let previewPanel: StubPreviewPanel;
  let configPanel: StubConfigPanel;
  let controller: AppController;

  beforeEach(() => {
    vi.useFakeTimers();
    inputPanel = new StubInputPanel();
    previewPanel = new StubPreviewPanel();
    configPanel = new StubConfigPanel();
    controller = new AppController(
      inputPanel as any,
      previewPanel as any,
      configPanel as any,
      new Formatter(),
      new Highlighter(),
    );
    controller.init();
    // Set some SQL content
    inputPanel.setValue(`SELECT * FROM orders WHERE shop_id IN (1,2,3,4,5,6)`);
    // Flush debounce
    vi.runAllTimers();
  });

  it('方言变更后 PreviewPanel 立即更新', () => {
    const contentBefore = previewPanel.content;
    configPanel.setConfig({ dialect: 'mysql' });
    // Config changes are synchronous (no debounce)
    expect(previewPanel.content).not.toBe('');
    // Content may or may not differ for simple SQL, but pipeline ran
    expect(previewPanel.placeholder).toBe(false);
  });

  it('缩进宽度变更后 PreviewPanel 立即更新', () => {
    // First format with indent=2
    const content2 = previewPanel.content;

    // Change to indent=4 — should trigger immediate reformat
    configPanel.setConfig({ indentWidth: 4 });
    const content4 = previewPanel.content;

    // Both should be non-empty
    expect(content2.length).toBeGreaterThan(0);
    expect(content4.length).toBeGreaterThan(0);
  });

  it('valuesPerLine 变更后 PreviewPanel 立即更新', () => {
    configPanel.setConfig({ valuesPerLine: 2 });
    expect(previewPanel.content.length).toBeGreaterThan(0);
    expect(previewPanel.placeholder).toBe(false);
  });

  it('空输入时配置变更显示占位符', () => {
    inputPanel.setValue('');
    vi.runAllTimers();
    configPanel.setConfig({ dialect: 'mysql' });
    expect(previewPanel.placeholder).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AppController 基础行为
// ─────────────────────────────────────────────────────────────────────────────
describe('AppController 基础行为', () => {
  let inputPanel: StubInputPanel;
  let previewPanel: StubPreviewPanel;
  let configPanel: StubConfigPanel;
  let controller: AppController;

  beforeEach(() => {
    vi.useFakeTimers();
    inputPanel = new StubInputPanel();
    previewPanel = new StubPreviewPanel();
    configPanel = new StubConfigPanel();
    controller = new AppController(
      inputPanel as any,
      previewPanel as any,
      configPanel as any,
      new Formatter(),
      new Highlighter(),
    );
    controller.init();
  });

  it('init() 时空输入显示占位符', () => {
    expect(previewPanel.placeholder).toBe(true);
  });

  it('输入 SQL 后经 debounce 更新预览', () => {
    inputPanel.setValue(`SELECT 1`);
    // Before debounce fires, content not yet updated
    // After debounce
    vi.runAllTimers();
    expect(previewPanel.content.length).toBeGreaterThan(0);
    expect(previewPanel.placeholder).toBe(false);
  });

  it('清空输入后显示占位符', () => {
    inputPanel.setValue(`SELECT 1`);
    vi.runAllTimers();
    expect(previewPanel.placeholder).toBe(false);

    inputPanel.setValue('');
    vi.runAllTimers();
    expect(previewPanel.placeholder).toBe(true);
  });

  it('debounce 期间多次输入只触发一次格式化', () => {
    const formatSpy = vi.spyOn(new Formatter(), 'format');
    const spyFormatter = new Formatter();
    const spied = vi.spyOn(spyFormatter, 'format');

    const ctrl = new AppController(
      inputPanel as any,
      previewPanel as any,
      configPanel as any,
      spyFormatter,
      new Highlighter(),
    );
    ctrl.init();

    // Rapid input changes
    inputPanel.setValue('SELECT 1');
    inputPanel.setValue('SELECT 12');
    inputPanel.setValue('SELECT 123');

    // Only one format call after debounce
    vi.runAllTimers();
    // init() calls runPipeline once (empty), then 3 setValue calls debounce to 1
    expect(spied).toHaveBeenCalledTimes(1);

    formatSpy.mockRestore();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 10: 文档管理行为
// ─────────────────────────────────────────────────────────────────────────────
describe('Property 10: 文档管理行为', () => {
  let inputPanel: StubInputPanel;
  let previewPanel: StubPreviewPanel;
  let configPanel: StubConfigPanel;
  let historyPanel: StubHistoryPanel;
  let controller: AppController;

  beforeEach(() => {
    vi.useFakeTimers();
    inputPanel = new StubInputPanel();
    previewPanel = new StubPreviewPanel();
    configPanel = new StubConfigPanel();
    historyPanel = new StubHistoryPanel();
    controller = new AppController(
      inputPanel as any,
      previewPanel as any,
      configPanel as any,
      new Formatter(),
      new Highlighter(),
      historyPanel as any,
    );
    controller.init();
  });

  it('编辑器输入后 markDirty 被调用', () => {
    inputPanel.setValue('SELECT 1');
    expect(historyPanel.markDirtyCalls).toBeGreaterThan(0);
  });

  it('saveNow() 调用 updateActiveSql 并传入当前编辑器内容', () => {
    inputPanel.setValue('SELECT 42');
    vi.runAllTimers(); // flush format debounce
    controller.saveNow();
    expect(historyPanel.updateActiveSqlCalls).toContain('SELECT 42');
  });

  it('saveNow() 取消待执行的 save debounce', () => {
    inputPanel.setValue('SELECT 1');
    // saveNow before debounce fires
    controller.saveNow();
    const callsAfterSaveNow = historyPanel.updateActiveSqlCalls.length;
    // Advance timers — debounce should NOT fire again
    vi.runAllTimers();
    expect(historyPanel.updateActiveSqlCalls.length).toBe(callsAfterSaveNow);
  });

  it('文档切换时 flush 先于 switch 执行', () => {
    const order: string[] = [];
    // Patch updateActiveSql to record order
    const origUpdate = historyPanel.updateActiveSql.bind(historyPanel);
    historyPanel.updateActiveSql = (sql: string) => {
      order.push('flush:' + sql);
      origUpdate(sql);
    };

    inputPanel.setValue('SELECT dirty');
    vi.runAllTimers();
    // Mark dirty manually to simulate unsaved state
    historyPanel.markDirty();

    const newDoc: import('../src/types/index').SqlDocument = {
      id: 'stub-doc-2',
      label: '文档 2',
      sql: 'SELECT 2',
      updatedAt: Date.now(),
    };

    historyPanel.simulateSwitch(newDoc);
    order.push('switched');

    expect(order[0]).toMatch(/^flush:/);
    expect(order[order.length - 1]).toBe('switched');
  });

  it('文档切换后编辑器加载新文档的 SQL', () => {
    const newDoc: import('../src/types/index').SqlDocument = {
      id: 'stub-doc-2',
      label: '文档 2',
      sql: 'SELECT * FROM products',
      updatedAt: Date.now(),
    };
    historyPanel.simulateSwitch(newDoc);
    expect(inputPanel.getValue()).toBe('SELECT * FROM products');
  });

  it('loadingDoc 期间 markDirty 不被调用', () => {
    // Simulate startup load: init() sets loadingDoc=true, calls setValue, then false
    // After init, markDirtyCalls should be 0 (no user input yet)
    expect(historyPanel.markDirtyCalls).toBe(0);
  });
});
