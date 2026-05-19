import type { IStackTraceStrategy } from './IStackTraceStrategy';
import type { StackFrame, StackTraceLanguage } from '../../types/index';

/**
 * Python StackTrace strategy.
 *
 * Handles standard Python traceback output:
 *   "Traceback (most recent call last):"
 *   '  File "app.py", line 10, in foo'
 *   "    some_code()"
 *   "ExceptionType: message"
 *
 * Also handles chained exceptions:
 *   "During handling of the above exception, another exception occurred:"
 *   "The above exception was the direct cause of the following exception:"
 */
export class PythonStrategy implements IStackTraceStrategy {
  readonly language: StackTraceLanguage = 'python';

  // Python frame: 'File "path", line N, in func'
  private static readonly FILE_FRAME_RE =
    /^File\s+"([^"]+)",\s+line\s+(\d+),\s+in\s+(.+)$/;

  // Traceback header
  private static readonly TRACEBACK_RE = /^Traceback\s*\(most recent call last\)\s*:/i;

  // Chained exception separators
  private static readonly CHAIN_RE =
    /^(?:During handling of the above exception|The above exception was the direct cause)/i;

  detect(input: string): boolean {
    return (
      /Traceback \(most recent call last\)/i.test(input) ||
      /^\s*File\s+"[^"]+",\s+line\s+\d+/m.test(input)
    );
  }

  parse(input: string): StackFrame[] {
    const normalised = input.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalised.split('\n').filter((l) => l.trim().length > 0);
    const frames: StackFrame[] = [];

    let i = 0;
    while (i < lines.length) {
      const line = lines[i]!.trim();

      // Traceback header
      if (PythonStrategy.TRACEBACK_RE.test(line)) {
        frames.push({ type: 'unknown', raw: line });
        i++;
        continue;
      }

      // Chained exception separator
      if (PythonStrategy.CHAIN_RE.test(line)) {
        frames.push({ type: 'inner', raw: line });
        i++;
        continue;
      }

      // File frame line
      const fileMatch = PythonStrategy.FILE_FRAME_RE.exec(line);
      if (fileMatch) {
        const filePath = fileMatch[1]!;
        const lineNumber = fileMatch[2]!;
        const funcName = fileMatch[3]!.trim();

        // Next line may be the source code snippet — skip it (it's not a frame)
        const nextLine = lines[i + 1];
        const nextIsCode =
          nextLine !== undefined &&
          !PythonStrategy.FILE_FRAME_RE.test(nextLine.trim()) &&
          !PythonStrategy.TRACEBACK_RE.test(nextLine.trim()) &&
          !/^[\w.]+Error/.test(nextLine.trim()) &&
          !/^[\w.]+Exception/.test(nextLine.trim());

        frames.push({
          type: 'frame',
          raw: line,
          namespace: undefined,
          method: funcName,
          params: undefined,
          filePath,
          lineNumber,
        });

        i++;
        if (nextIsCode) {
          // Include the code snippet as an 'unknown' line for context
          frames.push({ type: 'unknown', raw: nextLine!.trim() });
          i++;
        }
        continue;
      }

      // Exception line: "ExceptionType: message" or bare "ExceptionType"
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        const typePart = line.slice(0, colonIdx).trim();
        // Python exception names are CamelCase identifiers, possibly dotted
        if (/^[\w.]+$/.test(typePart) && /[A-Z]/.test(typePart)) {
          frames.push({
            type: 'exception',
            raw: line,
            exceptionType: typePart,
            message: line.slice(colonIdx + 1).trim(),
          });
          i++;
          continue;
        }
      }

      frames.push({ type: 'unknown', raw: line });
      i++;
    }

    return frames;
  }
}
