import type { IStackTraceStrategy } from './IStackTraceStrategy';
import type { StackFrame, StackTraceLanguage } from '../../types/index';

/**
 * C# StackTrace strategy.
 *
 * Handles both English and Chinese (Simplified) .NET runtime output:
 *   English: "at Namespace.Class.Method(params) in file.cs:line N"
 *   Chinese: "在 Namespace.Class.Method(params) 位置 file.cs:行号 N"
 *
 * Frames in log output are often compressed onto a single line separated
 * by 2+ spaces before the frame prefix ("at " / "在 ").
 */
export class CSharpStrategy implements IStackTraceStrategy {
  readonly language: StackTraceLanguage = 'csharp';

  // Matches the start of a frame: 2+ spaces then "at " or "在 "
  private static readonly FRAME_SPLIT_RE = /(?:\s{2,})(at |在 )/g;

  // Chinese: split before "在 " when followed by a namespace-like identifier
  // (uppercase letter or namespace pattern like "System." / "S3.")
  private static readonly ZH_FRAME_BOUNDARY_RE = /\s(在 [A-Z][\w.]*)/g;

  // English: split before "at " when followed by a namespace-like identifier
  private static readonly EN_FRAME_BOUNDARY_RE = /\s(at [A-Z][\w.]*)/g;

  // English frame: "at <method> in <file>:line <N>"
  private static readonly EN_FRAME_RE =
    /^at\s+([\s\S]+?)\s+in\s+([\s\S]+?):line\s+(\d+)\s*$/;

  // English frame without file info: "at <method>"
  private static readonly EN_FRAME_NO_FILE_RE = /^at\s+([\s\S]+?)\s*$/;

  // Chinese frame: "在 <method> 位置 <file>:行号 <N>"
  private static readonly ZH_FRAME_RE =
    /^在\s+([\s\S]+?)\s+位置\s+([\s\S]+?):行号\s+(\d+)\s*$/;

  // Chinese frame without file info: "在 <method>"
  private static readonly ZH_FRAME_NO_FILE_RE = /^在\s+([\s\S]+?)\s*$/;

  // Inner exception separator
  private static readonly INNER_RE = /^-{3,}>/;

  detect(input: string): boolean {
    return (
      /\bat\s+\S/.test(input) ||
      /\s在\s+\S/.test(input) ||
      /^在\s+\S/.test(input)
    );
  }

  parse(input: string): StackFrame[] {
    const lines = this.splitIntoLines(input);
    return lines.map((line) => this.parseLine(line.trim()));
  }

  /**
   * Split compressed log line into individual frame lines.
   * Handles both already-newline-separated and space-compressed formats.
   *
   * Splitting strategies (applied in order):
   *   1. 2+ spaces before "at " / "在 "  (original multi-space separator)
   *   2. Single space before "在 <Namespace>" or "at <Namespace>"
   *      (common in Chinese .NET logs where frames are joined with one space)
   */
  private splitIntoLines(input: string): string[] {
    // Normalise line endings
    const normalised = input.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // If already multi-line, skip aggressive splitting
    const hasNewlines = normalised.includes('\n');

    let expanded = normalised;

    if (!hasNewlines) {
      // Single-line compressed: split before "在 <Namespace>" / "at <Namespace>"
      expanded = expanded.replace(
        CSharpStrategy.ZH_FRAME_BOUNDARY_RE,
        '\n$1',
      );
      expanded = expanded.replace(
        CSharpStrategy.EN_FRAME_BOUNDARY_RE,
        '\n$1',
      );
    } else {
      // Multi-line but may still have some compressed frames (2+ spaces)
      expanded = expanded.replace(
        CSharpStrategy.FRAME_SPLIT_RE,
        '\n$1',
      );
    }

    return expanded
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
  }

  private parseLine(line: string): StackFrame {
    // Inner exception separator
    if (CSharpStrategy.INNER_RE.test(line)) {
      return { type: 'inner', raw: line };
    }

    // English frame with file
    const enMatch = CSharpStrategy.EN_FRAME_RE.exec(line);
    if (enMatch) {
      return this.buildFrameFromMethod(line, enMatch[1]!, enMatch[2], enMatch[3]);
    }

    // Chinese frame with file
    const zhMatch = CSharpStrategy.ZH_FRAME_RE.exec(line);
    if (zhMatch) {
      return this.buildFrameFromMethod(line, zhMatch[1]!, zhMatch[2], zhMatch[3]);
    }

    // English frame without file
    const enNoFile = CSharpStrategy.EN_FRAME_NO_FILE_RE.exec(line);
    if (enNoFile) {
      return this.buildFrameFromMethod(line, enNoFile[1]!);
    }

    // Chinese frame without file
    const zhNoFile = CSharpStrategy.ZH_FRAME_NO_FILE_RE.exec(line);
    if (zhNoFile && (line.startsWith('在 ') || line.startsWith('在\t'))) {
      return this.buildFrameFromMethod(line, zhNoFile[1]!);
    }

    // Exception header: "TypeName: message"
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0 && !/^\s*(at|在)\s/.test(line)) {
      const typePart = line.slice(0, colonIdx).trim();
      // Heuristic: exception type looks like a dotted identifier
      if (/^[\w.`$]+$/.test(typePart)) {
        return {
          type: 'exception',
          raw: line,
          exceptionType: typePart,
          message: line.slice(colonIdx + 1).trim(),
        };
      }
    }

    return { type: 'unknown', raw: line };
  }

  /**
   * Split "Namespace.Class.Method(params)" into namespace, method, params.
   */
  private buildFrameFromMethod(
    raw: string,
    methodSignature: string,
    filePath?: string,
    lineNumber?: string,
  ): StackFrame {
    const parenIdx = methodSignature.indexOf('(');
    let methodFull: string;
    let params: string | undefined;

    if (parenIdx >= 0) {
      methodFull = methodSignature.slice(0, parenIdx).trim();
      params = methodSignature.slice(parenIdx).trim();
    } else {
      methodFull = methodSignature.trim();
    }

    const lastDot = methodFull.lastIndexOf('.');
    const namespace = lastDot >= 0 ? methodFull.slice(0, lastDot) : undefined;
    const method = lastDot >= 0 ? methodFull.slice(lastDot + 1) : methodFull;

    return {
      type: 'frame',
      raw,
      namespace: namespace || undefined,
      method,
      params,
      filePath,
      lineNumber,
    };
  }
}
