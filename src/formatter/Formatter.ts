import { format as sqlFormat } from 'sql-formatter';
import type { FormatterConfig, FormatResult } from '../types/index';

/**
 * Core SQL formatting module.
 * Wraps sql-formatter and applies post-processing for:
 *  - blank-line separation between statements
 *  - IN-clause value grouping per line
 */
export class Formatter {
  /**
   * Format raw SQL text according to the given config.
   * Never throws — on error returns the original text with an error message.
   */
  format(sql: string, config: FormatterConfig): FormatResult {
    if (!sql || !sql.trim()) {
      return { text: '' };
    }

    try {
      const formatted = sqlFormat(sql, {
        language: config.dialect,
        tabWidth: config.indentWidth,
        keywordCase: config.keywordCase,
        // Ask sql-formatter to keep values on one line so our post-processor
        // can apply the valuesPerLine grouping consistently.
        expressionWidth: 9999,
      });

      const withStatementGaps = this.postProcessStatements(
        formatted,
        config.linesBetweenQueries,
      );
      const withComma = this.postProcessCommaPosition(withStatementGaps, config.commaPosition);
      const withInGroups = this.postProcessInClauses(withComma, config.valuesPerLine);

      return { text: withInGroups };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { text: sql, error: `格式化失败: ${message}` };
    }
  }

  /**
   * Ensure exactly `linesBetweenQueries` blank lines between consecutive SQL
   * statements, and strip any trailing blank lines from the output.
   */
  private postProcessStatements(formatted: string, linesBetweenQueries: 1 | 2 = 1): string {
    // Normalise Windows line endings
    const normalised = formatted.replace(/\r\n/g, '\n');

    // Split into individual statements
    const statements = normalised
      .split(/\n{2,}/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (statements.length <= 1) {
      return normalised.trimEnd();
    }

    const separator = '\n'.repeat(linesBetweenQueries + 1);
    return statements.join(separator);
  }

  /**
   * Convert comma position between 'after' (trailing) and 'before' (leading).
   * sql-formatter always outputs trailing commas; this post-processor moves
   * them to the beginning of the next line when commaPosition === 'before'.
   */
  private postProcessCommaPosition(sql: string, commaPosition: 'before' | 'after'): string {
    if (commaPosition === 'after') return sql;

    // Move trailing comma + optional spaces + newline → newline + indent + comma + space
    // Pattern: <comma><optional spaces><newline><indent>
    return sql.replace(/,(\s*)\n(\s*)/g, (_match, _spaces, indent) => {
      return `\n${indent}, `;
    });
  }

  /**
   * Group IN-clause values so that at most `valuesPerLine` values appear on
   * each line, indented to align with the opening parenthesis.
   */
  private postProcessInClauses(sql: string, valuesPerLine: number): string {
    if (valuesPerLine < 1) return sql;

    try {
      return sql.replace(/\bIN\s*\(([\s\S]*?)\)/gi, (match, inner) => {
        const values = inner
          .split(',')
          .map((v: string) => v.trim())
          .filter((v: string) => v.length > 0);

        if (values.length === 0) return match;

        // If all values fit on one line, keep them there
        if (values.length <= valuesPerLine) {
          return `IN (${values.join(', ')})`;
        }

        // Group into rows of valuesPerLine
        const indent = '    ';
        const rows: string[] = [];
        for (let i = 0; i < values.length; i += valuesPerLine) {
          rows.push(indent + values.slice(i, i + valuesPerLine).join(', '));
        }

        return `IN (\n${rows.join(',\n')}\n)`;
      });
    } catch {
      return sql;
    }
  }
}
