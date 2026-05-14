/**
 * Task 5.5 — PreviewPanel.getPlainText() property tests
 *
 * Property 8: 复制内容不含 HTML 标签
 * getPlainText() 返回值不含 < 或 > 字符（来自标签）
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { PreviewPanel } from '../src/ui/PreviewPanel';

// jsdom is provided by vitest environment: 'jsdom'

let container: HTMLDivElement;
let panel: PreviewPanel;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  panel = new PreviewPanel(container);
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 8: 复制内容不含 HTML 标签
// ─────────────────────────────────────────────────────────────────────────────
describe('Property 8: getPlainText() 不含 HTML 标签', () => {
  it('setContent() 后 getPlainText() 不含 HTML 标签', () => {
    const html = `<span class="hljs-keyword">SELECT</span> <span class="hljs-title">id</span> FROM users`;
    panel.setContent(html);
    const text = panel.getPlainText();
    expect(text).not.toMatch(/<[^>]+>/);
    expect(text).not.toContain('<span');
    expect(text).not.toContain('</span>');
  });

  it('setContent() 后 getPlainText() 保留 SQL 文本内容', () => {
    const html = `<span class="hljs-keyword">SELECT</span> id FROM users`;
    panel.setContent(html);
    const text = panel.getPlainText();
    expect(text).toContain('SELECT');
    expect(text).toContain('id');
    expect(text).toContain('FROM');
    expect(text).toContain('users');
  });

  it('setPlaceholder() 后 getPlainText() 不含 HTML 标签', () => {
    panel.setPlaceholder();
    const text = panel.getPlainText();
    expect(text).not.toMatch(/<[^>]+>/);
  });

  it('setError() 后 getPlainText() 不含 HTML 标签', () => {
    panel.setError('格式化失败: syntax error', 'SELECT * FROM');
    const text = panel.getPlainText();
    expect(text).not.toMatch(/<[^>]+>/);
  });

  it('复杂高亮 HTML 剥离后文本正确', () => {
    const formattedSql = `SELECT\n  id,\n  name\nFROM\n  users\nWHERE\n  status = 'active'`;
    // 模拟 highlight.js 输出
    const html = formattedSql
      .replace(/SELECT/g, '<span class="hljs-keyword">SELECT</span>')
      .replace(/FROM/g, '<span class="hljs-keyword">FROM</span>')
      .replace(/WHERE/g, '<span class="hljs-keyword">WHERE</span>')
      .replace(/'active'/g, '<span class="hljs-string">\'active\'</span>');

    panel.setContent(html);
    const text = panel.getPlainText();

    // 不含任何 HTML 标签
    expect(text).not.toMatch(/<[^>]+>/);
    // 包含原始 SQL 内容
    expect(text).toContain('SELECT');
    expect(text).toContain('FROM');
    expect(text).toContain('WHERE');
    expect(text).toContain("'active'");
  });

  it('getPlainText() 返回字符串类型', () => {
    panel.setContent('<span>SELECT 1</span>');
    expect(typeof panel.getPlainText()).toBe('string');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PreviewPanel 状态管理
// ─────────────────────────────────────────────────────────────────────────────
describe('PreviewPanel 状态管理', () => {
  it('初始状态显示占位符', () => {
    const text = panel.getPlainText();
    expect(text.length).toBeGreaterThan(0);
    // 占位符文本
    expect(text).toContain('格式化结果将在此处显示');
  });

  it('setContent() 后错误横幅隐藏', () => {
    panel.setError('some error');
    panel.setContent('<span>SELECT 1</span>');
    const errorEl = container.querySelector('.preview-error') as HTMLElement;
    expect(errorEl.hidden).toBe(true);
  });

  it('setError() 后错误横幅可见', () => {
    panel.setError('格式化失败');
    const errorEl = container.querySelector('.preview-error') as HTMLElement;
    expect(errorEl.hidden).toBe(false);
    expect(errorEl.textContent).toContain('格式化失败');
  });

  it('setPlaceholder() 后错误横幅隐藏', () => {
    panel.setError('some error');
    panel.setPlaceholder();
    const errorEl = container.querySelector('.preview-error') as HTMLElement;
    expect(errorEl.hidden).toBe(true);
  });
});
