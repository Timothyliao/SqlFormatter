import type { StackTraceResult } from '../../types/index';
import type { IStackTraceStrategy } from './IStackTraceStrategy';
import { CSharpStrategy } from './CSharpStrategy';
import { JavaStrategy } from './JavaStrategy';
import { PythonStrategy } from './PythonStrategy';

/**
 * StackTrace formatter entry point.
 *
 * Iterates strategies in priority order (most distinctive first),
 * delegates to the first matching strategy, falls back to CSharp as default.
 *
 * Priority:
 *   1. Python  — "File "..." pattern is unique
 *   2. Java    — "Caused by:" is distinctive
 *   3. C#      — broadest match ("at " / "在 "), used as fallback
 */
export class StackTraceFormatter {
  private readonly strategies: IStackTraceStrategy[];

  constructor() {
    this.strategies = [
      new PythonStrategy(),
      new JavaStrategy(),
      new CSharpStrategy(), // fallback
    ];
  }

  /**
   * Format raw stacktrace text.
   * Never throws — on unexpected error returns an 'unknown' result.
   */
  format(input: string): StackTraceResult {
    if (!input || !input.trim()) {
      return { language: 'unknown', frames: [] };
    }

    try {
      const strategy =
        this.strategies.find((s) => s.detect(input)) ??
        this.strategies[this.strategies.length - 1]!;

      const frames = strategy.parse(input);
      return { language: strategy.language, frames };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        language: 'unknown',
        frames: [{ type: 'unknown', raw: input }],
        error: `解析失败: ${message}`,
      };
    }
  }
}
