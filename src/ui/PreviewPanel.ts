/**
 * A single foldable SQL statement block.
 */
interface StatementBlock {
  /** Raw highlighted-HTML lines belonging to this statement */
  htmlLines: string[];
  /** Whether this block is currently collapsed */
  collapsed: boolean;
  /**
   * Number of leading comment/blank lines at the top of this block.
   * These lines are ALWAYS rendered (never hidden by folding).
   * The fold toggle appears on htmlLines[foldAnchorLine] and only
   * htmlLines[foldAnchorLine..end] are hidden when collapsed.
   */
  leadingCommentCount: number;
  /**
   * Index of the first non-comment, non-blank line — where the fold
   * toggle appears and where the summary text comes from.
   * Equals leadingCommentCount (they track the same boundary).
   */
  foldAnchorLine: number;
}

/**
 * PreviewPanel — right-side formatted SQL preview.
 *
 * Architecture:
 *   .preview-wrapper
 *     .preview-gutter          ← line numbers + fold icons (gutter-row per visible line)
 *     .preview-code            ← pure <pre><code>, white-space:pre, NO block elements inside
 *
 * The code area contains only text nodes and inline <span> tags from highlight.js.
 * Fold state is managed by rebuilding the innerHTML of <code> on every toggle.
 *
 * Gutter rows are built in parallel with the code content so line numbers
 * always match visible lines exactly.
 */
export class PreviewPanel {
  private wrapperEl: HTMLElement;
  private gutterEl: HTMLElement;
  private codeEl: HTMLElement;   // the <pre>
  private errorEl: HTMLElement;
  private showLineNumbers = true;

  private blocks: StatementBlock[] = [];
  private lastHtml = '';

  constructor(container: HTMLElement) {
    this.wrapperEl = document.createElement('div');
    this.wrapperEl.className = 'preview-wrapper';

    this.gutterEl = document.createElement('div');
    this.gutterEl.className = 'preview-gutter';

    this.codeEl = document.createElement('pre');
    this.codeEl.className = 'preview-code';
    const codeInner = document.createElement('code');
    codeInner.className = 'language-sql';
    this.codeEl.appendChild(codeInner);

    this.wrapperEl.appendChild(this.gutterEl);
    this.wrapperEl.appendChild(this.codeEl);

    this.errorEl = document.createElement('div');
    this.errorEl.className = 'preview-error';
    this.errorEl.setAttribute('role', 'alert');
    this.errorEl.setAttribute('aria-live', 'polite');
    this.errorEl.hidden = true;

    container.appendChild(this.errorEl);
    container.appendChild(this.wrapperEl);

    this.setPlaceholder();
  }

  // ── Public API ───────────────────────────────────────────────────────────

  setContent(html: string): void {
    this.errorEl.hidden = true;
    this.errorEl.textContent = '';
    this.codeEl.classList.remove('is-placeholder');
    this.lastHtml = html;
    this.blocks = this.parseBlocks(html);
    this.render();
  }

  setPlaceholder(): void {
    this.errorEl.hidden = true;
    this.errorEl.textContent = '';
    this.blocks = [];
    this.lastHtml = '';

    const codeInner = this.codeEl.querySelector('code') as HTMLElement;
    codeInner.innerHTML = '';
    codeInner.textContent = '格式化结果将在此处显示…';
    this.codeEl.classList.add('is-placeholder');
    this.gutterEl.innerHTML = '';
  }

  setError(message: string, rawText?: string): void {
    this.errorEl.textContent = `⚠ ${message}`;
    this.errorEl.hidden = false;
    this.codeEl.classList.remove('is-placeholder');

    if (rawText !== undefined) {
      this.blocks = [];
      this.lastHtml = '';
      const codeInner = this.codeEl.querySelector('code') as HTMLElement;
      codeInner.textContent = rawText;
      this.buildSimpleGutter(rawText.split('\n').length);
    }
  }

  /** Full plain text regardless of fold state — used by CopyButton. */
  getPlainText(): string {
    if (this.blocks.length === 0) {
      const codeInner = this.codeEl.querySelector('code') as HTMLElement;
      return codeInner.textContent ?? '';
    }
    // Re-join blocks with blank lines between them (mirrors original formatting).
    // Strip HTML tags first, then unescape HTML entities that highlight.js introduced
    // (e.g. &#x27; → ', &lt; → <, &gt; → >, &amp; → &).
    return this.blocks
      .map(b => this.unescapeHtml(b.htmlLines.join('\n').replace(/<[^>]*>/g, '')))
      .join('\n\n');
  }

  setLineNumbers(show: boolean): void {
    this.showLineNumbers = show;
    this.gutterEl.style.display = show ? '' : 'none';
    this.wrapperEl.classList.toggle('preview-wrapper--no-gutter', !show);
  }

  foldAll(): void {
    if (this.blocks.length < 2) return;
    let changed = false;
    this.blocks.forEach(b => {
      const sqlLineCount = b.htmlLines.length - b.leadingCommentCount;
      if (sqlLineCount > 1 && !b.collapsed) { b.collapsed = true; changed = true; }
    });
    if (changed) this.render();
  }

  unfoldAll(): void {
    if (this.blocks.length < 2) return;
    let changed = false;
    this.blocks.forEach(b => {
      if (b.collapsed) { b.collapsed = false; changed = true; }
    });
    if (changed) this.render();
  }

  // ── Parsing ──────────────────────────────────────────────────────────────

  /**
   * Parse highlighted HTML into StatementBlock[].
   *
   * Phase 1 — split on blank lines into candidate blocks.
   * Phase 2 — strip leading comment-only candidates from each SQL block:
   *            comment-only candidates become their own non-foldable blocks,
   *            so they are always visible and never folded away.
   * Phase 3 — merge consecutive SQL candidates until one ends with `;`.
   *            This keeps WITH…SELECT as a single block.
   * Phase 4 — compute foldAnchorLine (first non-comment line).
   */
  private parseBlocks(html: string): StatementBlock[] {
    const rawLines = html.split('\n');

    // Phase 1: blank-line split — each candidate is a non-empty run of lines
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

    // Phase 2 & 3: separate comment-only blocks, then merge SQL blocks by semicolon
    // A candidate is "comment-only" if every non-blank line is a comment line.
    const result: string[][] = [];
    let i = 0;
    while (i < candidates.length) {
      const cand = candidates[i]!;
      if (this.isCommentOnlyBlock(cand)) {
        // Comment block — keep as-is, never merge, never foldable
        result.push(cand);
        i++;
      } else {
        // SQL block — merge forward until we hit a semicolon boundary
        let block = cand;
        while (!this.endsWithSemicolon(block) && i + 1 < candidates.length) {
          i++;
          const next = candidates[i]!;
          if (this.isCommentOnlyBlock(next)) {
            // Don't absorb a comment-only block into the SQL block;
            // push what we have so far, then let the outer loop handle the comment.
            i--; // rewind so outer loop processes the comment next
            break;
          }
          block = [...block, '', ...next];
        }
        result.push(block);
        i++;
      }
    }

    // Phase 4: build StatementBlock[]
    return result.map(lines => {
      const anchor = this.findAnchorLine(lines);
      return {
        htmlLines: lines,
        collapsed: false,
        foldAnchorLine: anchor,
        leadingCommentCount: anchor,
      };
    });
  }

  /**
   * True if every non-blank line in `lines` is a comment line.
   * Used to keep comment blocks separate and always visible.
   */
  private isCommentOnlyBlock(lines: string[]): boolean {
    for (const line of lines) {
      const plain = line.replace(/<[^>]*>/g, '').trim();
      if (plain === '') continue;
      if (/^--/.test(plain)) continue;
      if (/^\/\*/.test(plain)) continue;
      if (/^\*\//.test(plain)) continue;
      if (/^\*/.test(plain)) continue;
      return false; // found a non-comment line
    }
    return true;
  }

  private endsWithSemicolon(lines: string[]): boolean {
    for (let i = lines.length - 1; i >= 0; i--) {
      const plain = (lines[i] ?? '').replace(/<[^>]*>/g, '').trim();
      if (plain !== '') return /;\s*$/.test(plain);
    }
    return false;
  }

  /**
   * First non-comment, non-blank line index — where the fold icon appears.
   */
  private findAnchorLine(lines: string[]): number {
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

  // ── Rendering ────────────────────────────────────────────────────────────

  /**
   * Rebuild code area and gutter from current blocks state.
   *
   * Code area strategy:
   *   - The <code> element gets its innerHTML set to a single HTML string.
   *   - Each block contributes either its full htmlLines joined by '\n'
   *     (expanded) or a single summary line (collapsed).
   *   - Blocks are separated by '\n\n' (the blank line between statements).
   *   - No block-level DOM elements are inserted — only text + inline spans.
   *
   * Gutter strategy:
   *   - We walk the same sequence (block by block, line by line) and create
   *     one .gutter-row per visible line.
   *   - The anchor line of a foldable block gets a .gutter-fold button.
   *   - origLine tracks the original line number (1-based, counts all lines
   *     including those hidden by folding).
   */
  private render(): void {
    const codeInner = this.codeEl.querySelector('code') as HTMLElement;

    // ── Single / no block: plain render ──────────────────────────────────
    if (this.blocks.length <= 1) {
      codeInner.innerHTML = this.lastHtml;
      const lineCount = this.lastHtml.replace(/<[^>]*>/g, '').split('\n').length;
      this.buildSimpleGutter(lineCount);
      return;
    }

    // ── Multi-block ───────────────────────────────────────────────────────
    this.gutterEl.innerHTML = '';
    const htmlParts: string[] = [];
    let origLine = 1;

    this.blocks.forEach((block, blockIdx) => {
      // A block is foldable only if it has SQL lines (anchor < total lines)
      // AND there are at least 2 SQL lines (anchor+1 < total).
      const sqlLineCount = block.htmlLines.length - block.leadingCommentCount;
      const foldable = sqlLineCount > 1;

      if (block.collapsed) {
        // ── Collapsed ─────────────────────────────────────────────────────
        // 1. Always render leading comment lines
        for (let li = 0; li < block.leadingCommentCount; li++) {
          htmlParts.push(block.htmlLines[li]!);
          htmlParts.push('\n');
          this.appendGutterRow(origLine, false, -1);
          origLine++;
        }

        // 2. Render anchor line as summary (with fold toggle in gutter)
        const anchorHtml = block.htmlLines[block.foldAnchorLine] ?? '';
        const anchorPlain = anchorHtml.replace(/<[^>]*>/g, '').trim();
        const summary = anchorPlain.length > 80
          ? anchorPlain.slice(0, 80) + ' \u2026'
          : anchorPlain + ' \u2026';
        htmlParts.push(`<span class="fold-summary">${this.escapeHtml(summary)}</span>`);

        // Gutter: anchor line with fold button
        const anchorOrigLine = origLine; // origLine already advanced past comments
        this.appendGutterRow(anchorOrigLine, foldable, blockIdx);

        // Advance origLine past all hidden SQL lines
        origLine += sqlLineCount;

      } else {
        // ── Expanded ──────────────────────────────────────────────────────
        block.htmlLines.forEach((htmlLine, lineIdx) => {
          htmlParts.push(htmlLine);

          const isFoldAnchor = foldable && lineIdx === block.foldAnchorLine;
          this.appendGutterRow(origLine, isFoldAnchor, isFoldAnchor ? blockIdx : -1);
          origLine++;

          const isLastLine = lineIdx === block.htmlLines.length - 1;
          if (!isLastLine) htmlParts.push('\n');
        });
      }

      // Blank separator between blocks (not after last)
      if (blockIdx < this.blocks.length - 1) {
        htmlParts.push('\n\n');
        this.appendGutterRow(origLine, false, -1);
        origLine++;
      }
    });

    codeInner.innerHTML = htmlParts.join('');
  }

  /**
   * Append one .gutter-row to the gutter.
   * @param lineNum    Original line number to display
   * @param hasFold    Whether this row gets a fold button
   * @param blockIdx   Index into this.blocks (-1 = no fold button)
   */
  private appendGutterRow(lineNum: number, hasFold: boolean, blockIdx: number): void {
    const row = document.createElement('div');
    row.className = 'gutter-row';

    const numSpan = document.createElement('span');
    numSpan.className = 'gutter-num';
    numSpan.textContent = String(lineNum);
    row.appendChild(numSpan);

    if (hasFold && blockIdx >= 0) {
      const block = this.blocks[blockIdx]!;
      const btn = document.createElement('button');
      btn.className = 'gutter-fold';
      btn.setAttribute('aria-label', block.collapsed ? '展开语句' : '折叠语句');
      btn.textContent = block.collapsed ? '▶' : '▼';
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleBlock(blockIdx);
      });
      row.appendChild(btn);
    }

    this.gutterEl.appendChild(row);
  }

  /** Simple gutter for single-block / error renders. */
  private buildSimpleGutter(lineCount: number): void {
    this.gutterEl.innerHTML = '';
    if (!this.showLineNumbers) return;
    for (let i = 1; i <= lineCount; i++) {
      const row = document.createElement('div');
      row.className = 'gutter-row';
      const numSpan = document.createElement('span');
      numSpan.className = 'gutter-num';
      numSpan.textContent = String(i);
      row.appendChild(numSpan);
      this.gutterEl.appendChild(row);
    }
  }

  private toggleBlock(idx: number): void {
    const block = this.blocks[idx];
    if (!block) return;
    block.collapsed = !block.collapsed;
    this.render();
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /**
   * Reverse HTML entity encoding introduced by highlight.js.
   * Handles the four entities that highlight.js escapes:
   *   &amp; → &   (must be last to avoid double-unescaping)
   *   &lt;  → <
   *   &gt;  → >
   *   &#x27; → '
   *   &quot; → "
   */
  private unescapeHtml(text: string): string {
    return text
      .replace(/&#x27;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
  }
}
