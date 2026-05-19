import type { FormatResult } from '../types/index';

// Marker for big integers that exceed Number.MAX_SAFE_INTEGER.
// Uses a long unique prefix unlikely to appear in real data.
const BIG_INT_PREFIX = '$$__KIRO_BIGINT_7f3a9c2e4b1d__$$';
const BIG_INT_RE_ENCODE = new RegExp(`"\\$\\$__KIRO_BIGINT_7f3a9c2e4b1d__\\$\\$([-]?\\d+)"`, 'g');

/**
 * Replace unsafe integer literals with marked strings before JSON.parse.
 * Matches: bare integer literals (with optional minus) that are 16+ digits.
 */
function protectBigInts(json: string): string {
  return json.replace(
    /(^|[:\[,\s])\s*(-?\d{16,})\s*(?=[,\}\]\s]|$)/g,
    (match, prefix: string, digits: string) => {
      const n = Number(digits);
      if (!Number.isSafeInteger(n)) {
        return `${prefix}"${BIG_INT_PREFIX}${digits}"`;
      }
      return match;
    }
  );
}

/**
 * Restore marked strings back to bare number literals after JSON.stringify.
 */
function restoreBigInts(json: string): string {
  return json.replace(BIG_INT_RE_ENCODE, (_, digits: string) => digits);
}

/**
 * Recursively parse any string value that is itself valid JSON.
 * Handles arbitrarily nested stringified JSON (e.g. biz -> args -> ...).
 */
function deepParse(value: unknown): unknown {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      try {
        return deepParse(JSON.parse(protectBigInts(trimmed)));
      } catch { /* not JSON, keep as string */ }
    }
    return value;
  }
  if (Array.isArray(value)) return value.map(deepParse);
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = deepParse(v);
    }
    return result;
  }
  return value;
}

/**
 * JSON formatting strategy.
 * Automatically unwraps leading/trailing quotes and recursively expands
 * any string values that are themselves valid JSON.
 * Preserves big integer precision via marker-based protection.
 *
 * Handles the following input forms (in order):
 *   1. Normal JSON:            {"a":1}  /  [1,2,3]
 *   2. Quoted JSON string:     "{\"a\":1}"
 *   3. Raw escaped JSON:       {\"a\":1}  (no outer quotes, backslash-escaped)
 *   4. Double-escaped JSON:    {\\"a\\":1}
 */
export class JsonFormatter {
  format(input: string, indentWidth: 2 | 4): FormatResult {
    const trimmed = input.trim();
    if (!trimmed) return { text: '' };

    // Strip surrounding quotes if the whole input is a quoted JSON string
    let normalized = trimmed;
    if (normalized.startsWith('"') && normalized.endsWith('"')) {
      try {
        normalized = JSON.parse(normalized) as string;
      } catch { /* keep as-is */ }
    }

    // Try to parse as-is first
    try {
      const protected_ = protectBigInts(normalized);
      const parsed = deepParse(JSON.parse(protected_));
      const formatted = JSON.stringify(parsed, null, indentWidth);
      return { text: restoreBigInts(formatted) };
    } catch { /* fall through to unescape attempts */ }

    // Try unescaping backslash-escaped quotes: \" → "
    // Handles raw escaped JSON like: [{\"id\":\"abc\"}]
    const unescapedSingle = normalized.replace(/\\"/g, '"');
    if (unescapedSingle !== normalized) {
      try {
        const protected_ = protectBigInts(unescapedSingle);
        const parsed = deepParse(JSON.parse(protected_));
        const formatted = JSON.stringify(parsed, null, indentWidth);
        return { text: restoreBigInts(formatted) };
      } catch { /* fall through */ }
    }

    // Try double-unescape: \\" → " (double-escaped JSON)
    const unescapedDouble = normalized.replace(/\\\\"/g, '"');
    if (unescapedDouble !== normalized) {
      try {
        const protected_ = protectBigInts(unescapedDouble);
        const parsed = deepParse(JSON.parse(protected_));
        const formatted = JSON.stringify(parsed, null, indentWidth);
        return { text: restoreBigInts(formatted) };
      } catch { /* fall through */ }
    }

    // All attempts failed — return original input with error
    try {
      JSON.parse(normalized);
    } catch (e) {
      return { text: input, error: (e as Error).message };
    }
    return { text: input };
  }
}
