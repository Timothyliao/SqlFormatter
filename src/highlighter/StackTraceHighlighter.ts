import type { StackFrame, StackTraceResult } from '../types/index';

/**
 * StackTrace syntax highlighter.
 *
 * Converts a StackTraceResult into an HTML string using semantic CSS classes.
 * All output is HTML-escaped; no raw user content is injected unescaped.
 *
 * CSS classes used (defined in main.css):
 *   .st-exception-type  — exception class name
 *   .st-message         — exception message text
 *   .st-namespace       — namespace prefix before method name
 *   .st-method          — final method name
 *   .st-params          — parameter list
 *   .st-file            — source file path
 *   .st-line-kw         — "in" / "位置" keyword
 *   .st-line-num        — line number value
 *   .st-inner           — inner/chained exception separator
 *   .st-unknown         — unrecognised lines
 */
export class StackTraceHighlighter {
  /**
   * Render a StackTraceResult as an HTML string.
   * Each frame becomes one line; lines are joined with '\n'.
   */
  highlight(result: StackTraceResult): string {
    if (result.frames.length === 0) return '';
    return result.frames.map((f) => this.renderFrame(f)).join('\n');
  }

  private renderFrame(frame: StackFrame): string {
    switch (frame.type) {
      case 'exception':
        return this.renderException(frame);
      case 'frame':
        return this.renderStackFrame(frame);
      case 'inner':
        return this.renderInner(frame);
      default:
        return this.renderUnknown(frame);
    }
  }

  private renderException(frame: StackFrame): string {
    const type = frame.exceptionType
      ? `<span class="st-exception-type">${this.esc(frame.exceptionType)}</span>`
      : '';
    const msg = frame.message
      ? `<span class="st-message">: ${this.esc(frame.message)}</span>`
      : '';
    return `${type}${msg}`;
  }

  private renderStackFrame(frame: StackFrame): string {
    const parts: string[] = [];

    // Namespace prefix
    if (frame.namespace) {
      parts.push(`<span class="st-namespace">${this.esc(frame.namespace)}.</span>`);
    }

    // Method name
    if (frame.method) {
      parts.push(`<span class="st-method">${this.esc(frame.method)}</span>`);
    }

    // Parameter list
    if (frame.params) {
      parts.push(`<span class="st-params">${this.esc(frame.params)}</span>`);
    }

    // File location
    if (frame.filePath) {
      parts.push(` <span class="st-line-kw">in</span> `);
      parts.push(`<span class="st-file">${this.esc(frame.filePath)}</span>`);
    }

    if (frame.lineNumber) {
      parts.push(`<span class="st-line-kw">:</span>`);
      parts.push(`<span class="st-line-num">${this.esc(frame.lineNumber)}</span>`);
    }

    return parts.join('');
  }

  private renderInner(frame: StackFrame): string {
    // May carry exception info (e.g. Java "Caused by:")
    if (frame.exceptionType) {
      const prefix = `<span class="st-inner">${this.esc(frame.raw.split(':')[0] ?? frame.raw)}: </span>`;
      const type = `<span class="st-exception-type">${this.esc(frame.exceptionType)}</span>`;
      const msg = frame.message
        ? `<span class="st-message">: ${this.esc(frame.message)}</span>`
        : '';
      return `${prefix}${type}${msg}`;
    }
    return `<span class="st-inner">${this.esc(frame.raw)}</span>`;
  }

  private renderUnknown(frame: StackFrame): string {
    return `<span class="st-unknown">${this.esc(frame.raw)}</span>`;
  }

  private esc(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
