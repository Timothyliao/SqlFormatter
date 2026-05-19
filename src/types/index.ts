/**
 * Supported SQL dialects for formatting.
 */
export type SqlDialect = 'postgresql' | 'mysql' | 'sqlite';

/**
 * Formatter mode — determines which formatter strategy is used.
 */
export type FormatterMode = 'sql' | 'json' | 'stacktrace';

/**
 * Unified format target combining mode + dialect into a single selector value.
 */
export type FormatTarget = 'sql-postgresql' | 'sql-mysql' | 'sql-sqlite' | 'json' | 'stacktrace';

/**
 * Application theme.
 */
export type AppTheme = 'dark' | 'light';

/**
 * A SQL document — the primary unit of work.
 * Each document persists its own SQL content independently.
 */
export interface SqlDocument {
  /** Unique identifier */
  id: string;
  /** User-editable label */
  label: string;
  /** The SQL content of this document */
  sql: string;
  /** Timestamp of last modification */
  updatedAt: number;
}

/**
 * Keyword case options.
 */
export type KeywordCase = 'upper' | 'lower' | 'preserve';

/**
 * Comma position options.
 */
export type CommaPosition = 'before' | 'after';

/**
 * Configuration options for the SQL formatter.
 */
export interface FormatterConfig {
  /** SQL dialect to use for formatting. Default: 'postgresql' */
  dialect: SqlDialect;
  /** Number of spaces per indentation level. Default: 2 */
  indentWidth: 2 | 4;
  /** Number of IN-clause values to place on each line. Range: 1–100. Default: 3 */
  valuesPerLine: number;
  /** Keyword case transformation. Default: 'upper' */
  keywordCase: KeywordCase;
  /** Comma position: before or after the expression. Default: 'after' */
  commaPosition: CommaPosition;
  /** Number of blank lines between multiple SQL statements. Default: 1 */
  linesBetweenQueries: 1 | 2;
}

/**
 * Result returned by Formatter.format().
 */
export interface FormatResult {
  /** Formatted SQL text. On error, contains the original unformatted input. */
  text: string;
  /** Present and non-empty when formatting failed. */
  error?: string;
}

// ── StackTrace types ──────────────────────────────────────────────────────────

/**
 * Supported stacktrace source languages.
 */
export type StackTraceLanguage = 'csharp' | 'java' | 'python' | 'unknown';

/**
 * A single parsed frame or header line from a stacktrace.
 */
export interface StackFrame {
  /** Semantic type of this line */
  type: 'exception' | 'frame' | 'inner' | 'unknown';
  /** Original raw text — used as fallback for rendering */
  raw: string;

  // ── exception line fields ──
  /** Exception class name, e.g. "System.NullReferenceException" */
  exceptionType?: string;
  /** Human-readable message after the colon */
  message?: string;

  // ── frame line fields ──
  /** Namespace prefix before the final method segment */
  namespace?: string;
  /** Final method name (last segment before the parameter list) */
  method?: string;
  /** Raw parameter list including parentheses, e.g. "(Int32 id)" */
  params?: string;
  /** Source file path */
  filePath?: string;
  /** Line number as string */
  lineNumber?: string;
}

/**
 * Result returned by StackTraceFormatter.format().
 */
export interface StackTraceResult {
  /** Detected source language */
  language: StackTraceLanguage;
  /** Parsed frames in order */
  frames: StackFrame[];
  /** Present when the input could not be parsed at all */
  error?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * Default configuration values.
 */
export const DEFAULT_CONFIG: FormatterConfig = {
  dialect: 'postgresql',
  indentWidth: 2,
  valuesPerLine: 3,
  keywordCase: 'upper',
  commaPosition: 'after',
  linesBetweenQueries: 1,
};

/** Maximum number of documents to retain */
export const MAX_DOCUMENTS = 5;

/** Maximum SQL size per document in bytes (~200 KB) */
export const MAX_SQL_BYTES = 200 * 1024;

/** Default font size (px) for editor and preview */
export const DEFAULT_FONT_SIZE = 13;
