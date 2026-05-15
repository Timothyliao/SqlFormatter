/**
 * previewParser.ts — pure functions for parsing and rendering highlighted SQL.
 * Extracted from PreviewPanel.ts; no DOM dependencies.
 */

/**
 * A single foldable SQL statement block.
 */
export interface StatementBlock {
  /** Raw highlighted-HTML lines belonging to this statement */
  htmlLines: string[];
  /**
   * Number of leading comment/blank lines at the top of this block.
   * These lines are ALWAYS rendered (never hidden by folding).
   */
  leadingCommentCount: number;
  /**
   * Index of the first non-comment, non-blank line — where the fold
   * toggle appears and where the summary text comes from.
   */
  foldAnchorLine: number;
}

/**
 * A single row in the gutter (line number + optional fold button).
 */
export interface GutterRow {
  /** Unique key for v-for rendering */
  key: string;
  /** Original line number (1-based) */
  lineNum: number;
  /** Whether this row has a fold toggle button */
  foldable: boolean;
  /** Index into blocks array (-1 = no fold button) */
  blockIdx: number;
}

// ── HTML helpers ──────────────────────────────────────────────────────────────

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Reverse HTML entity encoding introduced by highlight.js.
 */
export function unescapeHtml(text: string): string {
  return text
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

// ── Block detection helpers ───────────────────────────────────────────────────

function isCommentOnlyBlock(lines: string[]): boolean {
  for (const line of lines) {
    const plain = line.replace(/<[^>]*>/g, '').trim();
    if (plain === '') continue;
    if (/^--/.test(plain)) continue;
    if (/^\/\*/.test(plain)) continue;
    if (/^\*\//.test(plain)) continue;
    if (/^\*/.test(plain)) continue;
    return false;
  }
  return true;
}

function endsWithSemicolon(lines: string[]): boolean {
  for (let i = lines.length - 1; i >= 0; i--) {
    const plain = (lines[i] ?? '').replace(/<[^>]*>/g, '').trim();
    if (plain !== '') return /;\s*$/.test(plain);
  }
  return false;
}

function findAnchorLine(lines: string[]): number {
  for (let i = 0; i < lines.length; i++) {
    const plain = (lines[i] ?? '').replace(/<[^>]*>/g, '').trim();
    if (plain === '') continue;
    if (/^--/.test(plain)) continue;
    if (/^\/\*/.test(plain)) continue;
    if (/^\*\//.test(plain)) continue;
    if (/^\*/.test(plain)) continue;
    return i;
  }
  return 0;
}

// ── Main parsing function ─────────────────────────────────────────────────────

/**
 * Parse highlighted HTML into StatementBlock[].
 *
 * Phase 1 — split on blank lines into candidate blocks.
 * Phase 2 — separate comment-only blocks (always visible, never foldable).
 * Phase 3 — merge consecutive SQL candidates until one ends with `;`.
 * Phase 4 — compute foldAnchorLine.
 */
export function parseBlocks(html: string): StatementBlock[] {
  if (!html) return [];

  const rawLines = html.split('\n');

  // Phase 1: blank-line split
  const candidates: string[][] = [];
  let cur: string[] = [];
  for (const line of rawLines) {
    const plain = line.replace(/<[^>]*>/g, '').trim();
    if (plain === '') {
      if (cur.length > 0) { candidates.push(cur); cur = []; }
    } else {
      cur.push(line);
    }
  }
  if (cur.length > 0) candidates.push(cur);
  if (candidates.length === 0) return [];

  // Phase 2 & 3: separate comment-only blocks, merge SQL blocks by semicolon
  const result: string[][] = [];
  let i = 0;
  while (i < candidates.length) {
    const cand = candidates[i]!;
    if (isCommentOnlyBlock(cand)) {
      result.push(cand);
      i++;
    } else {
      let block = cand;
      while (!endsWithSemicolon(block) && i + 1 < candidates.length) {
        i++;
        const next = candidates[i]!;
        if (isCommentOnlyBlock(next)) {
          i--;
          break;
        }
        block = [...block, '', ...next];
      }
      result.push(block);
      i++;
    }
  }

  // Phase 4: build StatementBlock[]
  return result.map((lines) => {
    const anchor = findAnchorLine(lines);
    return {
      htmlLines: lines,
      foldAnchorLine: anchor,
      leadingCommentCount: anchor,
    };
  });
}

// ── Gutter builder ────────────────────────────────────────────────────────────

/**
 * Build the list of gutter rows from blocks and collapsed state.
 */
export function buildGutterRows(
  blocks: StatementBlock[],
  collapsed: boolean[],
): GutterRow[] {
  if (blocks.length === 0) return [];

  const rows: GutterRow[] = [];
  let origLine = 1;
  let keyCounter = 0;

  blocks.forEach((block, blockIdx) => {
    const sqlLineCount = block.htmlLines.length - block.leadingCommentCount;
    const foldable = sqlLineCount > 1;
    const isCollapsed = collapsed[blockIdx] ?? false;

    if (isCollapsed) {
      // Leading comment lines
      for (let li = 0; li < block.leadingCommentCount; li++) {
        rows.push({ key: `r-${keyCounter++}`, lineNum: origLine, foldable: false, blockIdx: -1 });
        origLine++;
      }
      // Anchor line (with fold button)
      rows.push({ key: `r-${keyCounter++}`, lineNum: origLine, foldable, blockIdx: foldable ? blockIdx : -1 });
      // Advance past hidden SQL lines
      origLine += sqlLineCount;
    } else {
      block.htmlLines.forEach((_line, lineIdx) => {
        const isFoldAnchor = foldable && lineIdx === block.foldAnchorLine;
        rows.push({
          key: `r-${keyCounter++}`,
          lineNum: origLine,
          foldable: isFoldAnchor,
          blockIdx: isFoldAnchor ? blockIdx : -1,
        });
        origLine++;
      });
    }

    // Blank separator row between blocks (not after last)
    if (blockIdx < blocks.length - 1) {
      rows.push({ key: `r-${keyCounter++}`, lineNum: origLine, foldable: false, blockIdx: -1 });
      origLine++;
    }
  });

  return rows;
}

// ── Code HTML builder ─────────────────────────────────────────────────────────

/**
 * Build the innerHTML string for the code area from blocks and collapsed state.
 */
export function buildCodeHtml(blocks: StatementBlock[], collapsed: boolean[]): string {
  if (blocks.length === 0) return '';

  const parts: string[] = [];

  blocks.forEach((block, blockIdx) => {
    const isCollapsed = collapsed[blockIdx] ?? false;

    if (isCollapsed) {
      // Leading comment lines
      for (let li = 0; li < block.leadingCommentCount; li++) {
        parts.push(block.htmlLines[li]!);
        parts.push('\n');
      }
      // Anchor line as summary
      const anchorHtml = block.htmlLines[block.foldAnchorLine] ?? '';
      const anchorPlain = anchorHtml.replace(/<[^>]*>/g, '').trim();
      const summary =
        anchorPlain.length > 80
          ? anchorPlain.slice(0, 80) + ' \u2026'
          : anchorPlain + ' \u2026';
      parts.push(`<span class="fold-summary">${escapeHtml(summary)}</span>`);
    } else {
      block.htmlLines.forEach((htmlLine, lineIdx) => {
        parts.push(htmlLine);
        const isLastLine = lineIdx === block.htmlLines.length - 1;
        if (!isLastLine) parts.push('\n');
      });
    }

    // Blank separator between blocks
    if (blockIdx < blocks.length - 1) {
      parts.push('\n\n');
    }
  });

  return parts.join('');
}

// ── Simple gutter (single block / error) ─────────────────────────────────────

/**
 * Build simple gutter rows for a single-block or error render.
 */
export function buildSimpleGutterRows(lineCount: number): GutterRow[] {
  const rows: GutterRow[] = [];
  for (let i = 1; i <= lineCount; i++) {
    rows.push({ key: `sg-${i}`, lineNum: i, foldable: false, blockIdx: -1 });
  }
  return rows;
}

// ── Plain text extraction ─────────────────────────────────────────────────────

/**
 * Extract plain text from blocks (strips HTML tags and unescapes entities).
 */
export function getPlainTextFromBlocks(blocks: StatementBlock[]): string {
  return blocks
    .map((b) => unescapeHtml(b.htmlLines.join('\n').replace(/<[^>]*>/g, '')))
    .join('\n\n');
}
