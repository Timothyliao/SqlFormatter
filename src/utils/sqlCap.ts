import { MAX_SQL_BYTES } from '../types/index';

/**
 * Truncate SQL string to MAX_SQL_BYTES bytes.
 * Preserves valid UTF-8 by slicing at character boundaries.
 */
export function capSql(sql: string): string {
  const bytes = new TextEncoder().encode(sql).length;
  if (bytes <= MAX_SQL_BYTES) return sql;
  let truncated = sql;
  while (new TextEncoder().encode(truncated).length > MAX_SQL_BYTES) {
    truncated = truncated.slice(0, Math.floor(truncated.length * 0.9));
  }
  return truncated;
}
