import hljs from 'highlight.js/lib/core';
import sql from 'highlight.js/lib/languages/sql';
import json from 'highlight.js/lib/languages/json';
import type { SqlDialect } from '../types/index';

hljs.registerLanguage('sql', sql);
hljs.registerLanguage('json', json);

type HlLanguage = SqlDialect | 'json';

/**
 * Syntax highlighting module.
 * Wraps highlight.js and returns an HTML string with <span> tags.
 */
export class Highlighter {
  highlight(text: string, language: HlLanguage): string {
    if (!text) return '';
    const lang = language === 'json' ? 'json' : 'sql';
    try {
      return hljs.highlight(text, { language: lang }).value;
    } catch {
      return this.escapeHtml(text);
    }
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
