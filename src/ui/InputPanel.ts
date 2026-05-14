import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { sql } from '@codemirror/lang-sql';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { bracketMatching, indentOnInput } from '@codemirror/language';
import { oneDark } from '@codemirror/theme-one-dark';
import type { AppTheme } from '../types/index';

/** Light theme overrides for CodeMirror (Catppuccin Latte palette) */
const lightTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: '#eff1f5',
      color: '#4c4f69',
    },
    '.cm-content': {
      caretColor: '#1e66f5',
    },
    '.cm-cursor': {
      borderLeftColor: '#1e66f5',
    },
    '.cm-gutters': {
      backgroundColor: '#e6e9ef',
      borderRight: '1px solid #ccd0da',
      color: '#8c8fa1',
    },
    '.cm-activeLineGutter': {
      backgroundColor: '#eff1f5',
    },
    '.cm-activeLine': {
      backgroundColor: 'rgba(30, 102, 245, 0.06)',
    },
    '.cm-matchingBracket': {
      backgroundColor: 'rgba(30, 102, 245, 0.2)',
      outline: '1px solid #1e66f5',
    },
    '.cm-selectionBackground, ::selection': {
      backgroundColor: 'rgba(30, 102, 245, 0.2)',
    },
    // Syntax token colors (Catppuccin Latte)
    '.cm-keyword': { color: '#8839ef', fontWeight: '600' },
    '.cm-string': { color: '#40a02b' },
    '.cm-number': { color: '#fe640b' },
    '.cm-comment': { color: '#8c8fa1', fontStyle: 'italic' },
    '.cm-operator': { color: '#1e66f5' },
    '.cm-variableName': { color: '#04a5e5' },
  },
  { dark: false },
);

/** Dark theme overrides (Catppuccin Mocha palette) */
const darkThemeOverrides = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: 'var(--editor-font-size, 13px)',
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace",
  },
  '.cm-scroller': {
    overflow: 'auto',
    lineHeight: '1.6',
  },
  '.cm-content': {
    padding: '16px 0',
    caretColor: '#89b4fa',
  },
  '.cm-line': {
    padding: '0 16px',
  },
  '.cm-gutters': {
    backgroundColor: '#181825',
    borderRight: '1px solid #313244',
    color: '#6c7086',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#1e1e2e',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(137, 180, 250, 0.06)',
  },
  '.cm-matchingBracket': {
    backgroundColor: 'rgba(137, 180, 250, 0.25)',
    outline: '1px solid #89b4fa',
  },
  '.cm-cursor': {
    borderLeftColor: '#89b4fa',
  },
});

/** Shared layout theme (font, sizing) — always applied */
const layoutTheme = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: 'var(--editor-font-size, 13px)',
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace",
  },
  '.cm-scroller': {
    overflow: 'auto',
    lineHeight: '1.6',
  },
  '.cm-content': {
    padding: '16px 0',
  },
  '.cm-line': {
    padding: '0 16px',
  },
});

/**
 * InputPanel — wraps a CodeMirror 6 editor on the left side of the layout.
 * Exposes getValue() / setValue() / onChange() / setTheme() interface.
 */
export class InputPanel {
  private view: EditorView;
  private themeCompartment = new Compartment();
  private changeCallbacks: Array<(value: string) => void> = [];

  constructor(container: HTMLElement) {
    const startDoc =
      "-- 在此输入 SQL…\n\nSELECT id, name FROM users WHERE status = 'active';";

    this.view = new EditorView({
      state: EditorState.create({
        doc: startDoc,
        extensions: [
          // ── Core editing features ──────────────────────────────────────
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          indentOnInput(),
          bracketMatching(),

          // ── SQL language support ───────────────────────────────────────
          sql(),

          // ── Visual features ────────────────────────────────────────────
          lineNumbers(),
          highlightActiveLine(),
          highlightActiveLineGutter(),

          // ── Layout theme (always applied) ──────────────────────────────
          layoutTheme,

          // ── Swappable color theme ──────────────────────────────────────
          this.themeCompartment.of([oneDark, darkThemeOverrides]),

          // ── Change listener ────────────────────────────────────────────
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              const value = update.state.doc.toString();
              this.changeCallbacks.forEach((cb) => cb(value));
            }
          }),
        ],
      }),
      parent: container,
    });

    // Make the editor fill the panel body
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.height = '100%';
    const cmEl = container.querySelector('.cm-editor') as HTMLElement | null;
    if (cmEl) {
      cmEl.style.flex = '1';
      cmEl.style.minHeight = '0';
    }
  }

  /** Return the current text content of the editor */
  getValue(): string {
    return this.view.state.doc.toString();
  }

  /** Programmatically set the editor content */
  setValue(value: string): void {
    this.view.dispatch({
      changes: {
        from: 0,
        to: this.view.state.doc.length,
        insert: value,
      },
    });
  }

  /** Register a callback that fires whenever the editor content changes */
  onChange(callback: (value: string) => void): void {
    this.changeCallbacks.push(callback);
  }

  /** Switch the editor color theme */
  setTheme(theme: AppTheme): void {
    this.view.dispatch({
      effects: this.themeCompartment.reconfigure(
        theme === 'light' ? [lightTheme] : [oneDark, darkThemeOverrides],
      ),
    });
  }

  /** Destroy the editor instance (cleanup) */
  destroy(): void {
    this.view.destroy();
  }
}
