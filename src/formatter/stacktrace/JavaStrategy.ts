import type { IStackTraceStrategy } from './IStackTraceStrategy';
import type { StackFrame, StackTraceLanguage } from '../../types/index';

/**
 * Java StackTrace strategy.
 *
 * Handles standard Java exception output:
 *   "ExceptionType: message"
 *   "\tat com.example.Class.method(File.java:42)"
 *   "Caused by: ExceptionType: message"
 *   "\t... N more"
 *
 * Frames may also be space-compressed in log output.
 */
export class JavaStrategy implements IStackTraceStrategy {
  readonly language: StackTraceLanguage = 'java';

  // Java frame: "at com.example.Class.method(File.java:42)"
  private static readonly FRAME_RE =
    /^at\s+([\w$.]+)\.([\w$<>]+)\(([^)]*)\)\s*$/;

  // "Caused by:" inner exception
  private static readonly CAUSED_BY_RE = /^Caused by:\s*/;

  // "... N more" suppressed frames
  private static readonly SUPPRESSED_RE = /^\.\.\.\s+\d+\s+more\s*$/;

  // Split compressed lines: 2+ spaces before "at "
  private static readonly FRAME_SPLIT_RE = /(?:\s{2,})(at\s)/g;

  detect(input: string): boolean {
    return /Caused by:/i.test(input) || /\bat\s+[\w$.]+\([\w$.]+\.java:\d+\)/.test(input);
  }

  parse(input: string): StackFrame[] {
    const lines = this.splitIntoLines(input);
    return lines.map((line) => this.parseLine(line.trim()));
  }

  private splitIntoLines(input: string): string[] {
    const normalised = input.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const expanded = normalised.replace(JavaStrategy.FRAME_SPLIT_RE, '\n$1');
    return expanded
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
  }

  private parseLine(line: string): StackFrame {
    // "Caused by:" — inner exception header
    if (JavaStrategy.CAUSED_BY_RE.test(line)) {
      const rest = line.replace(JavaStrategy.CAUSED_BY_RE, '');
      const colonIdx = rest.indexOf(':');
      if (colonIdx > 0) {
        return {
          type: 'inner',
          raw: line,
          exceptionType: rest.slice(0, colonIdx).trim(),
          message: rest.slice(colonIdx + 1).trim(),
        };
      }
      return { type: 'inner', raw: line };
    }

    // "... N more"
    if (JavaStrategy.SUPPRESSED_RE.test(line)) {
      return { type: 'unknown', raw: line };
    }

    // Standard frame
    const frameMatch = JavaStrategy.FRAME_RE.exec(line);
    if (frameMatch) {
      const namespace = frameMatch[1]!;
      const method = frameMatch[2]!;
      const locationStr = frameMatch[3]!;

      // Parse "(File.java:42)" or "(Native Method)" or "(Unknown Source)"
      const colonIdx = locationStr.lastIndexOf(':');
      let filePath: string | undefined;
      let lineNumber: string | undefined;

      if (colonIdx >= 0) {
        filePath = locationStr.slice(0, colonIdx);
        lineNumber = locationStr.slice(colonIdx + 1);
      } else {
        filePath = locationStr || undefined;
      }

      return {
        type: 'frame',
        raw: line,
        namespace,
        method,
        params: `(${locationStr})`,
        filePath,
        lineNumber,
      };
    }

    // Exception header: "TypeName: message"
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0 && !/^at\s/.test(line)) {
      const typePart = line.slice(0, colonIdx).trim();
      if (/^[\w.$/]+$/.test(typePart)) {
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
}
