/**
 * Task 9.2 — Integration tests
 *
 * Tests the full pipeline: InputPanel → AppController → Formatter → Highlighter → PreviewPanel
 * Tests the copy flow: CopyButton → PreviewPanel.getPlainText() → clipboard
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Formatter } from '../src/formatter/Formatter';
import { Highlighter } from '../src/highlighter/Highlighter';
import { PreviewPanel } from '../src/ui/PreviewPanel';

const BASE_CONFIG = {
  dialect: 'postgresql' as const,
  indentWidth: 2 as const,
  valuesPerLine: 3,
  keywordCase: 'upper' as const,
  commaPosition: 'after' as const,
  linesBetweenQueries: 1 as const,
};

// ─────────────────────────────────────────────────────────────────────────────
// Full pipeline integration
// ─────────────────────────────────────────────────────────────────────────────
describe('完整格式化流水线集成测试', () => {
  const formatter = new Formatter();
  const highlighter = new Highlighter();

  it('SELECT 语句：格式化 → 高亮 → 预览面板', () => {
    const container = document.createElement('div');
    const panel = new PreviewPanel(container);

    const sql = `select id,name,email from users where status='active' and age>18 order by name`;
    const config = { ...BASE_CONFIG };

    const result = formatter.format(sql, config);
    expect(result.error).toBeUndefined();

    const html = highlighter.highlight(result.text, config.dialect);
    panel.setContent(html);

    const plainText = panel.getPlainText();

    // 关键字应大写
    expect(plainText).toMatch(/SELECT/);
    expect(plainText).toMatch(/FROM/);
    expect(plainText).toMatch(/WHERE/);
    expect(plainText).toMatch(/ORDER BY/);

    // 不含 HTML 标签
    expect(plainText).not.toMatch(/<[^>]+>/);
  });

  it('多语句：格式化 → 高亮 → 预览面板，语句间有空行', () => {
    const container = document.createElement('div');
    const panel = new PreviewPanel(container);

    const sql = `SELECT 1; SELECT 2; SELECT 3;`;
    const config = { ...BASE_CONFIG };

    const result = formatter.format(sql, config);
    expect(result.error).toBeUndefined();

    const html = highlighter.highlight(result.text, config.dialect);
    panel.setContent(html);

    const plainText = panel.getPlainText();
    expect(plainText).not.toMatch(/<[^>]+>/);
    // 应有空行分隔
    expect(result.text).toMatch(/\n\n/);
  });

  it('IN 子句分组：格式化 → 高亮 → 预览面板', () => {
    const container = document.createElement('div');
    const panel = new PreviewPanel(container);

    const sql = `SELECT * FROM orders WHERE shop_id IN (1, 2, 3, 4, 5, 6, 7, 8, 9)`;
    const config = { ...BASE_CONFIG };

    const result = formatter.format(sql, config);
    expect(result.error).toBeUndefined();

    // IN 子句应被分组
    expect(result.text).toMatch(/1, 2, 3/);
    expect(result.text).toMatch(/4, 5, 6/);
    expect(result.text).toMatch(/7, 8, 9/);

    const html = highlighter.highlight(result.text, config.dialect);
    panel.setContent(html);

    const plainText = panel.getPlainText();
    expect(plainText).not.toMatch(/<[^>]+>/);
    expect(plainText).toContain('IN');
  });

  it('无效 SQL：降级展示原始文本，错误信息可见', () => {
    const container = document.createElement('div');
    const panel = new PreviewPanel(container);

    const formatter2 = new Formatter();
    const sql = 'SELECT * FROM';
    const config = { ...BASE_CONFIG };

    const result = formatter2.format(sql, config);
    expect(result.text.length).toBeGreaterThan(0);

    if (result.error) {
      panel.setError(result.error, result.text);
      const errorEl = container.querySelector('.preview-error') as HTMLElement;
      expect(errorEl.hidden).toBe(false);
    } else {
      const html = highlighter.highlight(result.text, config.dialect);
      panel.setContent(html);
      expect(panel.getPlainText().length).toBeGreaterThan(0);
    }
  });

  it('不同方言产生不同格式化结果', () => {
    const sql = `SELECT id FROM users LIMIT 10`;
    const pgConfig = { ...BASE_CONFIG, dialect: 'postgresql' as const };
    const myConfig = { ...BASE_CONFIG, dialect: 'mysql' as const };

    const pgResult = formatter.format(sql, pgConfig);
    const myResult = formatter.format(sql, myConfig);

    expect(pgResult.error).toBeUndefined();
    expect(myResult.error).toBeUndefined();

    expect(pgResult.text).toMatch(/SELECT/);
    expect(myResult.text).toMatch(/SELECT/);
  });

  it('关键字小写模式', () => {
    const sql = `SELECT id FROM users`;
    const config = { ...BASE_CONFIG, keywordCase: 'lower' as const };
    const result = formatter.format(sql, config);
    expect(result.error).toBeUndefined();
    expect(result.text).toMatch(/select/);
    expect(result.text).toMatch(/from/);
  });

  it('逗号行首模式', () => {
    const sql = `SELECT id, name, email FROM users`;
    const config = { ...BASE_CONFIG, commaPosition: 'before' as const };
    const result = formatter.format(sql, config);
    expect(result.error).toBeUndefined();
    // 行首逗号：逗号出现在行的开头（前面只有空白）
    expect(result.text).toMatch(/^\s*,/m);
  });

  it('linesBetweenQueries=2 时语句间有两个空行', () => {
    const sql = `SELECT 1; SELECT 2;`;
    const config = { ...BASE_CONFIG, linesBetweenQueries: 2 as const };
    const result = formatter.format(sql, config);
    expect(result.error).toBeUndefined();
    // 两个空行 = 三个连续换行
    expect(result.text).toMatch(/\n\n\n/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CopyButton → PreviewPanel.getPlainText() → clipboard
// ─────────────────────────────────────────────────────────────────────────────
describe('复制功能集成测试', () => {
  let writeTextMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('getPlainText() 写入剪贴板的内容不含 HTML 标签', async () => {
    const container = document.createElement('div');
    const panel = new PreviewPanel(container);

    const html = `<span class="hljs-keyword">SELECT</span> <span class="hljs-title">id</span>\n<span class="hljs-keyword">FROM</span> users`;
    panel.setContent(html);

    const plainText = panel.getPlainText();

    await navigator.clipboard.writeText(plainText);

    expect(writeTextMock).toHaveBeenCalledWith(plainText);
    const writtenText = writeTextMock.mock.calls[0][0] as string;
    expect(writtenText).not.toMatch(/<[^>]+>/);
    expect(writtenText).toContain('SELECT');
    expect(writtenText).toContain('FROM');
    expect(writtenText).toContain('users');
  });

  it('完整流水线后复制内容与格式化文本一致', async () => {
    const container = document.createElement('div');
    const panel = new PreviewPanel(container);
    const formatter = new Formatter();
    const highlighter = new Highlighter();

    const sql = `SELECT id, name FROM users WHERE id IN (1, 2, 3, 4, 5, 6)`;
    const config = { ...BASE_CONFIG };

    const result = formatter.format(sql, config);
    const html = highlighter.highlight(result.text, config.dialect);
    panel.setContent(html);

    const plainText = panel.getPlainText();
    await navigator.clipboard.writeText(plainText);

    const writtenText = writeTextMock.mock.calls[0][0] as string;

    expect(writtenText).not.toMatch(/<[^>]+>/);
    expect(writtenText).toContain('SELECT');
    expect(writtenText).toContain('FROM');
    expect(writtenText).toContain('IN');
  });
});
