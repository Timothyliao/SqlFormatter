import type { FormatTarget } from '../types/index';

/**
 * A single option in the format target selector.
 */
export interface FormatTargetOption {
  /** Value bound to <select> and stored in formatterStore */
  value: FormatTarget;
  /** Display label shown in the dropdown */
  label: string;
}

/**
 * A group of options rendered as <optgroup>.
 */
export interface FormatTargetGroup {
  /** <optgroup> label */
  label: string;
  options: FormatTargetOption[];
}

/**
 * All available format targets, grouped for the UI selector.
 *
 * To add a new format:
 *   1. Add its value to FormatTarget in types/index.ts
 *   2. Add a new entry here (new option in an existing group, or a new group)
 *   3. Add the corresponding pipeline branch in formatterStore.runPipeline()
 */
export const FORMAT_TARGET_GROUPS: FormatTargetGroup[] = [
  {
    label: 'SQL',
    options: [
      { value: 'sql-postgresql', label: 'SQL · PostgreSQL' },
      { value: 'sql-mysql',      label: 'SQL · MySQL' },
      { value: 'sql-sqlite',     label: 'SQL · SQLite' },
    ],
  },
  {
    label: '其他',
    options: [
      { value: 'json',       label: 'JSON' },
      { value: 'stacktrace', label: 'StackTrace' },
    ],
  },
];

/**
 * Flat list of all valid FormatTarget values.
 * Used for input validation (e.g. when reading from localStorage).
 */
export const VALID_FORMAT_TARGETS: ReadonlySet<FormatTarget> = new Set(
  FORMAT_TARGET_GROUPS.flatMap((g) => g.options.map((o) => o.value)),
);
