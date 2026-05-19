/**
 * previewParser.test.ts — unit tests for pure parsing functions
 * Migrated from preview-panel.test.ts
 */
import { describe, it, expect } from 'vitest';
import {
  parseBlocks,
  buildGutterRows,
  buildCodeHtml,
  escapeHtml,
  unescapeHtml,
  getPlainTextFromBlocks,
  parseJsonNodes,
  buildJsonGutterRows,
} from '../src/utils/previewParser';

// ─────────────────────────────────────────────────────────────────────────────
// escapeHtml / unescapeHtml
// ─────────────────────────────────────────────────────────────────────────────
describe('escapeHtml', () => {
  it('escapes & < >', () => {
    expect(escapeHtml('a & b < c > d')).toBe('a &amp; b &lt; c &gt; d');
  });
  it('no-op on plain text', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });
});

describe('unescapeHtml', () => {
  it('unescapes all entities', () => {
    expect(unescapeHtml('&amp;&lt;&gt;&quot;&#x27;')).toBe('&<>"\'');
  });
  it('no-op on plain text', () => {
    expect(unescapeHtml('hello')).toBe('hello');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// parseBlocks
// ─────────────────────────────────────────────────────────────────────────────
describe('parseBlocks', () => {
  it('empty string returns []', () => {
    expect(parseBlocks('')).toEqual([]);
  });

  it('single statement returns one block', () => {
    const html = '<span class="hljs-keyword">SELECT</span> id FROM users;';
    const blocks = parseBlocks(html);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.htmlLines).toHaveLength(1);
  });

  it('two statements separated by blank line returns two blocks', () => {
    const html = 'SELECT 1;\n\nSELECT 2;';
    const blocks = parseBlocks(html);
    expect(blocks).toHaveLength(2);
  });

  it('comment-only block is kept separate', () => {
    const html = '-- comment\n\nSELECT 1;';
    const blocks = parseBlocks(html);
    expect(blocks).toHaveLength(2);
    // comment-only block: all lines are comments, anchor=0, leadingCommentCount=0
    expect(blocks[0]!.leadingCommentCount).toBe(0);
    expect(blocks[1]!.htmlLines[0]).toContain('SELECT');
  });

  it('multi-line statement without semicolon merges with next', () => {
    const html = 'SELECT id\n\nFROM users;';
    const blocks = parseBlocks(html);
    // Should merge into one block since first part has no semicolon
    expect(blocks).toHaveLength(1);
  });

  it('foldAnchorLine skips leading comments', () => {
    const html = '-- comment\nSELECT 1;';
    const blocks = parseBlocks(html);
    expect(blocks[0]!.foldAnchorLine).toBe(1);
    expect(blocks[0]!.leadingCommentCount).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// buildGutterRows
// ─────────────────────────────────────────────────────────────────────────────
describe('buildGutterRows', () => {
  it('empty blocks returns []', () => {
    expect(buildGutterRows([], [])).toEqual([]);
  });

  it('single block with 3 lines returns 3 rows', () => {
    const blocks = parseBlocks('SELECT\n  id\nFROM users;');
    const rows = buildGutterRows(blocks, [false]);
    expect(rows).toHaveLength(3);
    expect(rows[0]!.lineNum).toBe(1);
    expect(rows[2]!.lineNum).toBe(3);
  });

  it('two blocks have separator row between them', () => {
    const blocks = parseBlocks('SELECT 1;\n\nSELECT 2;');
    const rows = buildGutterRows(blocks, [false, false]);
    // block1: 1 row, separator: 1 row, block2: 1 row = 3 rows
    expect(rows).toHaveLength(3);
  });

  it('collapsed block shows anchor row + skips hidden lines', () => {
    const blocks = parseBlocks('SELECT\n  id\nFROM users;');
    const rows = buildGutterRows(blocks, [true]);
    // 3 lines collapsed → anchor row only (1 row)
    expect(rows).toHaveLength(1);
    expect(rows[0]!.foldable).toBe(true);
    expect(rows[0]!.blockIdx).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// buildCodeHtml
// ─────────────────────────────────────────────────────────────────────────────
describe('buildCodeHtml', () => {
  it('empty blocks returns empty string', () => {
    expect(buildCodeHtml([], [])).toBe('');
  });

  it('expanded block returns original html lines joined by newlines', () => {
    const html = 'SELECT id\nFROM users;';
    const blocks = parseBlocks(html);
    const result = buildCodeHtml(blocks, [false]);
    expect(result).toContain('SELECT id');
    expect(result).toContain('FROM users;');
  });

  it('collapsed block shows fold-summary span', () => {
    const blocks = parseBlocks('SELECT\n  id\nFROM users;');
    const result = buildCodeHtml(blocks, [true]);
    expect(result).toContain('fold-summary');
    expect(result).toContain('\u2026');
  });

  it('two blocks separated by blank line in output', () => {
    const blocks = parseBlocks('SELECT 1;\n\nSELECT 2;');
    const result = buildCodeHtml(blocks, [false, false]);
    expect(result).toContain('\n\n');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getPlainTextFromBlocks — Property 8: 复制内容不含 HTML 标签
// ─────────────────────────────────────────────────────────────────────────────
describe('getPlainTextFromBlocks — no HTML tags', () => {
  it('strips all HTML tags', () => {
    const html = '<span class="hljs-keyword">SELECT</span> id FROM users';
    const blocks = parseBlocks(html);
    const text = getPlainTextFromBlocks(blocks);
    expect(text).not.toMatch(/<[^>]+>/);
    expect(text).toContain('SELECT');
    expect(text).toContain('FROM');
    expect(text).toContain('users');
  });

  it('unescapes HTML entities', () => {
    const html = "SELECT &#x27;active&#x27; FROM users";
    const blocks = parseBlocks(html);
    const text = getPlainTextFromBlocks(blocks);
    expect(text).toContain("'active'");
  });

  it('multiple blocks joined by double newline', () => {
    const blocks = parseBlocks('SELECT 1;\n\nSELECT 2;');
    const text = getPlainTextFromBlocks(blocks);
    expect(text).toContain('\n\n');
    expect(text).toContain('SELECT 1;');
    expect(text).toContain('SELECT 2;');
  });
});

describe('parseJsonNodes', () => {
  it('returns empty for empty input', () => {
    expect(parseJsonNodes('')).toEqual([]);
  });

  it('detects top-level object node', () => {
    const json = '{\n  "a": 1\n}';
    const nodes = parseJsonNodes(json);
    expect(nodes).toHaveLength(1);
    expect(nodes[0]).toMatchObject({ startLine: 1, endLine: 3, depth: 0 });
  });

  it('detects nested array node at depth 1', () => {
    const json = '{\n  "items": [\n    1,\n    2\n  ]\n}';
    const nodes = parseJsonNodes(json);
    const arr = nodes.find(n => n.depth === 1);
    expect(arr).toBeDefined();
    expect(arr!.startLine).toBe(2);
    expect(arr!.endLine).toBe(5);
  });

  it('emits nodes at all depths (no depth limit)', () => {
    const json = '{\n  "a": {\n    "b": {\n      "c": 1\n    }\n  }\n}';
    const nodes = parseJsonNodes(json);
    // All three levels should be foldable
    expect(nodes.some(n => n.depth === 0)).toBe(true);
    expect(nodes.some(n => n.depth === 1)).toBe(true);
    expect(nodes.some(n => n.depth === 2)).toBe(true);
  });

  it('does not emit node when open and close are on same line', () => {
    const json = '{\n  "a": {}\n}';
    const nodes = parseJsonNodes(json);
    // {} on same line should not produce a node
    expect(nodes.every(n => n.startLine !== n.endLine)).toBe(true);
  });
});

describe('buildJsonGutterRows', () => {
  it('hides lines inside collapsed node', () => {
    const nodes = [{ startLine: 1, endLine: 3, depth: 0 }];
    const collapsed = new Map([[1, true]]);
    const rows = buildJsonGutterRows(3, nodes, collapsed);
    // Only lines 1 and 3 visible (line 2 hidden)
    expect(rows.map(r => r.lineNum)).toEqual([1, 3]);
  });

  it('shows all lines when not collapsed', () => {
    const nodes = [{ startLine: 1, endLine: 3, depth: 0 }];
    const rows = buildJsonGutterRows(3, nodes, new Map());
    expect(rows).toHaveLength(3);
  });
});
