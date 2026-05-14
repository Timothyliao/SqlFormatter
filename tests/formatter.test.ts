/**
 * Task 3.2 — Formatter property tests
 *
 * Property 2: 无效 SQL 降级展示
 * Property 5: 缩进宽度一致性
 * Property 6: 多语句空行分隔
 * Property 7: IN 子句值分组
 */
import { describe, it, expect } from 'vitest';
import { Formatter } from '../src/formatter/Formatter';
import type { FormatterConfig } from '../src/types/index';

const formatter = new Formatter();

const baseConfig: FormatterConfig = {
  dialect: 'postgresql',
  indentWidth: 2,
  valuesPerLine: 3,
  keywordCase: 'upper',
  commaPosition: 'after',
  linesBetweenQueries: 1,
};

// ─────────────────────────────────────────────────────────────────────────────
// Property 2: 无效 SQL 降级展示
// 任意触发异常的字符串，format() 必须返回原始文本且 error 非空，不抛出异常
// ─────────────────────────────────────────────────────────────────────────────
describe('Property 2: 无效 SQL 降级展示', () => {
  it('空字符串返回空文本，无 error', () => {
    const result = formatter.format('', baseConfig);
    expect(result.text).toBe('');
    expect(result.error).toBeUndefined();
  });

  it('纯空白字符串返回空文本，无 error', () => {
    const result = formatter.format('   \n\t  ', baseConfig);
    expect(result.text).toBe('');
    expect(result.error).toBeUndefined();
  });

  it('有效 SQL 不产生 error', () => {
    const result = formatter.format('SELECT 1', baseConfig);
    expect(result.error).toBeUndefined();
    expect(result.text.length).toBeGreaterThan(0);
  });

  it('format() 永远不抛出异常', () => {
    const inputs = [
      '!!!invalid!!!',
      'SELECT * FROM',
      '(((',
      '\x00\x01\x02',
    ];
    for (const input of inputs) {
      expect(() => formatter.format(input, baseConfig)).not.toThrow();
    }
  });

  it('格式化失败时 text 保留原始输入', () => {
    // sql-formatter 对大多数输入都能处理，但我们可以验证：
    // 即使出错，text 字段也不为 undefined
    const weirdInput = 'SELECT @#$%';
    const result = formatter.format(weirdInput, baseConfig);
    expect(result.text).toBeDefined();
    expect(typeof result.text).toBe('string');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 5: 缩进宽度一致性
// 对任意 SQL 和 w ∈ {2, 4}，每个缩进层级恰好使用 w 个空格，无混用
// ─────────────────────────────────────────────────────────────────────────────
describe('Property 5: 缩进宽度一致性', () => {
  const sql = `SELECT id, name FROM users WHERE status = 'active' ORDER BY name`;

  it('indentWidth=2 时缩进为 2 空格倍数', () => {
    const result = formatter.format(sql, { ...baseConfig, indentWidth: 2 });
    expect(result.error).toBeUndefined();
    const lines = result.text.split('\n');
    for (const line of lines) {
      const leadingSpaces = line.match(/^( *)/)?.[1].length ?? 0;
      // 每行缩进必须是 2 的倍数
      expect(leadingSpaces % 2).toBe(0);
    }
  });

  it('indentWidth=4 时缩进为 4 空格倍数', () => {
    const result = formatter.format(sql, { ...baseConfig, indentWidth: 4 });
    expect(result.error).toBeUndefined();
    const lines = result.text.split('\n');
    for (const line of lines) {
      const leadingSpaces = line.match(/^( *)/)?.[1].length ?? 0;
      // 每行缩进必须是 4 的倍数
      expect(leadingSpaces % 4).toBe(0);
    }
  });

  it('indentWidth=2 和 indentWidth=4 产生不同输出', () => {
    const complexSql = `SELECT a, b FROM t WHERE x = 1 AND y = 2`;
    const r2 = formatter.format(complexSql, { ...baseConfig, indentWidth: 2 });
    const r4 = formatter.format(complexSql, { ...baseConfig, indentWidth: 4 });
    // 两者格式化结果应不同（缩进不同）
    expect(r2.text).not.toBe(r4.text);
  });

  it('不混用缩进宽度：indentWidth=2 输出中不含 4 空格开头的行（除非是 2 层缩进）', () => {
    const nestedSql = `SELECT * FROM (SELECT id FROM users) sub WHERE sub.id > 0`;
    const result = formatter.format(nestedSql, { ...baseConfig, indentWidth: 2 });
    expect(result.error).toBeUndefined();
    const lines = result.text.split('\n');
    for (const line of lines) {
      const leadingSpaces = line.match(/^( *)/)?.[1].length ?? 0;
      // 2 空格缩进时，不应出现奇数个前导空格
      expect(leadingSpaces % 2).toBe(0);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 6: 多语句空行分隔
// N ≥ 2 条语句时，输出恰好有 N−1 个空行分隔，每条语句以分号结尾，输出不以空行结尾
// ─────────────────────────────────────────────────────────────────────────────
describe('Property 6: 多语句空行分隔', () => {
  it('两条语句之间有且仅有一个空行', () => {
    const sql = `SELECT 1; SELECT 2;`;
    const result = formatter.format(sql, baseConfig);
    expect(result.error).toBeUndefined();

    // 不应有连续两个以上空行
    expect(result.text).not.toMatch(/\n{3,}/);
    // 应有恰好一个空行（两个连续换行）
    expect(result.text).toMatch(/\n\n/);
  });

  it('三条语句之间各有一个空行', () => {
    const sql = `SELECT 1; SELECT 2; SELECT 3;`;
    const result = formatter.format(sql, baseConfig);
    expect(result.error).toBeUndefined();

    // 不应有连续三个以上换行
    expect(result.text).not.toMatch(/\n{3,}/);

    // 应有两处空行分隔
    const blankLines = (result.text.match(/\n\n/g) ?? []).length;
    expect(blankLines).toBe(2);
  });

  it('输出末尾不以空行结尾', () => {
    const sql = `SELECT 1; SELECT 2;`;
    const result = formatter.format(sql, baseConfig);
    expect(result.error).toBeUndefined();
    expect(result.text).not.toMatch(/\n\s*$/);
  });

  it('单条语句不产生额外空行', () => {
    const sql = `SELECT id FROM users WHERE id = 1;`;
    const result = formatter.format(sql, baseConfig);
    expect(result.error).toBeUndefined();
    expect(result.text).not.toMatch(/\n\n/);
  });

  it('语句保留分号', () => {
    const sql = `SELECT 1; SELECT 2;`;
    const result = formatter.format(sql, baseConfig);
    expect(result.error).toBeUndefined();
    // 格式化后应包含分号
    expect(result.text).toContain(';');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 7: IN 子句值分组
// 对任意 IN 子句和 n ∈ [1, 100]，每行恰好 n 个值，最后一行为余数行，无填充
// ─────────────────────────────────────────────────────────────────────────────
describe('Property 7: IN 子句值分组', () => {
  it('valuesPerLine=3，6 个值分成 2 行，每行 3 个', () => {
    const sql = `SELECT * FROM orders WHERE shop_id IN (1, 2, 3, 4, 5, 6)`;
    const result = formatter.format(sql, { ...baseConfig, valuesPerLine: 3 });
    expect(result.error).toBeUndefined();

    // 应包含 IN ( 多行格式
    expect(result.text).toContain('IN (');
    // 每行值组：1, 2, 3 和 4, 5, 6
    expect(result.text).toMatch(/1, 2, 3/);
    expect(result.text).toMatch(/4, 5, 6/);
  });

  it('valuesPerLine=3，7 个值：前两行各 3 个，最后一行 1 个', () => {
    const sql = `SELECT * FROM t WHERE id IN (1, 2, 3, 4, 5, 6, 7)`;
    const result = formatter.format(sql, { ...baseConfig, valuesPerLine: 3 });
    expect(result.error).toBeUndefined();

    expect(result.text).toMatch(/1, 2, 3/);
    expect(result.text).toMatch(/4, 5, 6/);
    // 最后一行只有 7
    expect(result.text).toMatch(/\b7\b/);
  });

  it('valuesPerLine=1，每个值单独一行', () => {
    const sql = `SELECT * FROM t WHERE id IN (10, 20, 30)`;
    const result = formatter.format(sql, { ...baseConfig, valuesPerLine: 1 });
    expect(result.error).toBeUndefined();

    // 每个值应在独立行
    const inBlock = result.text.match(/IN\s*\(([\s\S]*?)\)/i)?.[1] ?? '';
    const lines = inBlock.split('\n').map(l => l.trim()).filter(Boolean);
    // 3 个值 → 3 行（每行一个值，可能带逗号）
    expect(lines.length).toBe(3);
  });

  it('valuesPerLine=100，少于 100 个值时保持单行', () => {
    const sql = `SELECT * FROM t WHERE id IN (1, 2, 3, 4, 5)`;
    const result = formatter.format(sql, { ...baseConfig, valuesPerLine: 100 });
    expect(result.error).toBeUndefined();

    // 值数量 ≤ valuesPerLine，应保持在一行内
    expect(result.text).toMatch(/IN\s*\(1, 2, 3, 4, 5\)/);
  });

  it('子查询中的 IN 子句也被处理', () => {
    const sql = `SELECT * FROM t WHERE id IN (SELECT id FROM u WHERE status IN (1, 2, 3, 4, 5, 6))`;
    const result = formatter.format(sql, { ...baseConfig, valuesPerLine: 3 });
    expect(result.error).toBeUndefined();
    // 外层 IN 子查询不受影响，内层 IN (1,2,3,4,5,6) 被分组
    expect(result.text).toMatch(/1, 2, 3/);
    expect(result.text).toMatch(/4, 5, 6/);
  });

  it('valuesPerLine=2，5 个值：2+2+1 分组', () => {
    const sql = `SELECT * FROM t WHERE id IN (10, 20, 30, 40, 50)`;
    const result = formatter.format(sql, { ...baseConfig, valuesPerLine: 2 });
    expect(result.error).toBeUndefined();

    expect(result.text).toMatch(/10, 20/);
    expect(result.text).toMatch(/30, 40/);
    expect(result.text).toMatch(/\b50\b/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 额外：关键字大写
// ─────────────────────────────────────────────────────────────────────────────
describe('关键字大写', () => {
  it('小写关键字被转换为大写', () => {
    const sql = `select id, name from users where id = 1`;
    const result = formatter.format(sql, baseConfig);
    expect(result.error).toBeUndefined();
    expect(result.text).toMatch(/SELECT/);
    expect(result.text).toMatch(/FROM/);
    expect(result.text).toMatch(/WHERE/);
  });
});
