import hljs from 'highlight.js/lib/core';
import sql from 'highlight.js/lib/languages/sql';
import type { SqlDialect } from '../types/index';

// Register only the SQL language pack to keep bundle size small
hljs.registerLanguage('sql', sql);

/**
 * Syntax highlighting module.
 * Wraps highlight.js and returns an HTML string with <span> tags.
 */
export class Highlighter {
  /**
   * Apply syntax highlighting to formatted SQL text.
   * @param formattedSql  Plain-text SQL (output of Formatter)
   * @param _dialect      Reserved for future dialect-specific highlighting
   * @returns             HTML string with hljs-* span classes applied
   */
  highlight(formattedSql: string, _dialect: SqlDialect): string {
    if (!formattedSql) return '';

    try {
      const result = hljs.highlight(formattedSql, { language: 'sql' });
      return result.value;
    } catch {
      // Fallback: escape HTML entities and return as plain text
      return this.escapeHtml(formattedSql);
    }
  }

  /** Escape HTML special characters for safe insertion into innerHTML */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
