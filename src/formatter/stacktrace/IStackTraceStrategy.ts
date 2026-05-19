import type { StackFrame, StackTraceLanguage } from '../../types/index';

/**
 * Strategy interface for StackTrace parsing.
 * Each language implements its own detection and parsing logic.
 */
export interface IStackTraceStrategy {
  /** Language identifier */
  readonly language: StackTraceLanguage;

  /**
   * Returns true if this strategy can handle the given input.
   * Called in priority order; first match wins.
   */
  detect(input: string): boolean;

  /**
   * Parse raw stacktrace text into structured StackFrame[].
   * Must never throw — on error, return frames with type 'unknown' and raw text.
   */
  parse(input: string): StackFrame[];
}
