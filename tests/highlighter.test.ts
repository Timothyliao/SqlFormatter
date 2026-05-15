/**
 * Task 4.2 — Highlighter property tests
 *
 * Property 3: 高亮输出保留原始文本
 * Property 4: 语法高亮覆盖所有 Token 类别
 */
import { describe, it, expect } from 'vitest';
import { Highlighter } from '../src/highlighter/Highlighter';

const highlighter = new Highlighter();

/** Strip all HTML tags from a string */
function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

// ─────────────────────────────────────────────────────────────────────────────
// Property 3: 高亮输出保留原始文本
// 剥离所有 HTML 标签后，输出文本与输入文本相等（空白规范化）
// ─────────────────────────────────────────────────────────────────────────────
describe('Property 3: 高亮输出保留原始文本', () => {
  const cases = [
    `SELECT id, name FROM users WHERE status = 'active'`,
    `SELECT * FROM orders WHERE shop_id IN (1, 2, 3)`,
    `INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com')`,
    `UPDATE users SET name = 'Bob' WHERE id = 42`,
    `DELETE FROM sessions WHERE expires_at < NOW()`,
    `SELECT COUNT(*) FROM logs -- count all logs`,
    `SELECT 1 + 2 AS result`,
  ];

  /** Decode all common HTML entities including &#x27; and &#039; */
  function decodeEntities(str: string): string {
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&#039;/g, "'")
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  }

  for (const sql of cases) {
    it(`剥离标签后文本不变: "${sql.slice(0, 40)}..."`, () => {
      const html = highlighter.highlight(sql, 'postgresql');
      const stripped = stripTags(html);
      const decoded = decodeEntities(stripped);
      expect(decoded).toBe(sql);
    });
  }

  it('空字符串输入返回空字符串', () => {
    expect(highlighter.highlight('', 'postgresql')).toBe('');
  });

  it('输出是有效 HTML（不含裸露的 < > 字符，除了标签内）', () => {
    const sql = `SELECT a < b FROM t WHERE x > 0`;
    const html = highlighter.highlight(sql, 'postgresql');
    // 验证原始 html 中 < 只出现在标签内
    const htmlWithoutTags = html.replace(/<[^>]+>/g, '');
    expect(htmlWithoutTags).not.toMatch(/<(?!\/)/); // 不含未闭合的 <
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 4: 语法高亮覆盖所有 Token 类别
// 含关键字、字符串字面量、数字字面量的 SQL，输出 HTML 必须包含对应 hljs class
// ─────────────────────────────────────────────────────────────────────────────
describe('Property 4: 语法高亮覆盖所有 Token 类别', () => {
  const sql = `SELECT id, name FROM users WHERE status = 'active' AND age > 18`;

  it('包含 hljs-keyword class（关键字高亮）', () => {
    const html = highlighter.highlight(sql, 'postgresql');
    expect(html).toMatch(/class="[^"]*hljs-keyword[^"]*"/);
  });

  it('包含 hljs-string class（字符串字面量高亮）', () => {
    const html = highlighter.highlight(sql, 'postgresql');
    expect(html).toMatch(/class="[^"]*hljs-string[^"]*"/);
  });

  it('包含 hljs-number class（数字字面量高亮）', () => {
    const html = highlighter.highlight(sql, 'postgresql');
    expect(html).toMatch(/class="[^"]*hljs-number[^"]*"/);
  });

  it('注释被高亮为 hljs-comment', () => {
    const sqlWithComment = `SELECT id FROM users -- get all users`;
    const html = highlighter.highlight(sqlWithComment, 'postgresql');
    expect(html).toMatch(/class="[^"]*hljs-comment[^"]*"/);
  });

  it('输出包含 <span> 标签（确认高亮生效）', () => {
    const html = highlighter.highlight(sql, 'postgresql');
    expect(html).toContain('<span');
  });

  it('多方言均能正常高亮', () => {
    const dialects = ['postgresql', 'mysql', 'sqlite'] as const;
    for (const dialect of dialects) {
      const html = highlighter.highlight(sql, dialect);
      expect(html.length).toBeGreaterThan(0);
      expect(html).toContain('<span');
    }
  });
});
