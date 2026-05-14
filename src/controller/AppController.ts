import type { FormatterConfig } from '../types/index';
import type { Formatter } from '../formatter/Formatter';
import type { Highlighter } from '../highlighter/Highlighter';
import type { InputPanel } from '../ui/InputPanel';
import type { PreviewPanel } from '../ui/PreviewPanel';
import type { ConfigPanel } from '../ui/ConfigPanel';
import type { HistoryPanel } from '../ui/HistoryPanel';
import type { SaveButton } from '../ui/SaveButton';

/**
 * AppController — orchestrates the formatting pipeline.
 *
 * Data flow:
 *   InputPanel (input event, debounced 250ms)  ──► runPipeline() ──► PreviewPanel
 *   ConfigPanel (change event, immediate)      ──► runPipeline()
 *
 * Document persistence:
 *   Editor keystroke ──► historyPanel.markDirty()
 *   Editor change (debounced 1s) ──► saveNow()
 *   Ctrl+S / SaveButton click    ──► saveNow() (flush immediately)
 *   Tab switch ──► historyPanel.onFlushNeeded ──► saveNow() ──► load new doc
 */
export class AppController {
  private config: FormatterConfig;
  private formatDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly FORMAT_DEBOUNCE_MS = 250;
  private readonly SAVE_DEBOUNCE_MS = 1000;

  /** True while loading a document — suppresses save-back to that same doc */
  private loadingDoc = false;

  constructor(
    private inputPanel: InputPanel,
    private previewPanel: PreviewPanel,
    private configPanel: ConfigPanel,
    private formatter: Formatter,
    private highlighter: Highlighter,
    private historyPanel?: HistoryPanel,
    private saveButton?: SaveButton,
  ) {
    this.config = configPanel.getConfig();
  }

  init(): void {
    // ── Input change ───────────────────────────────────────────────────────
    this.inputPanel.onChange(() => {
      // Mark dirty immediately on every keystroke
      if (!this.loadingDoc) {
        this.historyPanel?.markDirty();
      }

      // Format debounce (250ms)
      if (this.formatDebounceTimer !== null) clearTimeout(this.formatDebounceTimer);
      this.formatDebounceTimer = setTimeout(() => {
        this.formatDebounceTimer = null;
        this.runPipeline();
      }, this.FORMAT_DEBOUNCE_MS);

      // Save debounce (1s)
      if (!this.loadingDoc && this.historyPanel) {
        if (this.saveDebounceTimer !== null) clearTimeout(this.saveDebounceTimer);
        this.saveDebounceTimer = setTimeout(() => {
          this.saveDebounceTimer = null;
          this.saveNow();
        }, this.SAVE_DEBOUNCE_MS);
      }
    });

    // ── Config change: immediate reformat ─────────────────────────────────
    this.configPanel.onConfigChange((config: FormatterConfig) => {
      this.config = config;
      this.runPipeline();
    });

    // ── Font size change ───────────────────────────────────────────────────
    this.configPanel.onFontSizeChange((size: number) => {
      this.applyFontSize(size);
    });

    // ── Document switch: flush then load ──────────────────────────────────
    if (this.historyPanel) {
      // HistoryPanel calls this before switching — we flush the current editor
      this.historyPanel.onFlushNeeded(() => {
        this.saveNow();
      });

      // After switch: load the new doc's SQL
      this.historyPanel.onSwitch((doc) => {
        this.loadingDoc = true;
        this.inputPanel.setValue(doc.sql);
        if (this.formatDebounceTimer !== null) {
          clearTimeout(this.formatDebounceTimer);
          this.formatDebounceTimer = null;
        }
        this.runPipeline();
        this.loadingDoc = false;
      });
    }

    // ── Save button click ──────────────────────────────────────────────────
    if (this.saveButton) {
      this.saveButton.onClick(() => this.saveNow());
    }

    // ── Ctrl+S / Fold shortcuts ────────────────────────────────────────────
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        this.saveNow();
        return;
      }
      // Ctrl+Shift+[ — fold all statements
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === '[' || e.key === '{')) {
        e.preventDefault();
        this.previewPanel.foldAll();
        return;
      }
      // Ctrl+Shift+] — unfold all statements
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === ']' || e.key === '}')) {
        e.preventDefault();
        this.previewPanel.unfoldAll();
      }
    });

    // ── Initial font size ──────────────────────────────────────────────────
    this.applyFontSize(this.configPanel.getFontSize());

    // ── Load active document on startup ───────────────────────────────────
    if (this.historyPanel) {
      const active = this.historyPanel.getActiveDoc();
      if (active && active.sql) {
        this.loadingDoc = true;
        this.inputPanel.setValue(active.sql);
        this.loadingDoc = false;
      }
    }

    this.runPipeline();
  }

  /** Flush pending save immediately and update button state */
  saveNow(): void {
    if (!this.historyPanel) return;

    if (this.saveDebounceTimer !== null) {
      clearTimeout(this.saveDebounceTimer);
      this.saveDebounceTimer = null;
    }

    this.saveButton?.setState('saving');
    try {
      this.historyPanel.updateActiveSql(this.inputPanel.getValue());
      this.saveButton?.setState('saved');
    } catch {
      this.saveButton?.setState('error');
    }
  }

  runPipeline(): void {
    const sql = this.inputPanel.getValue();

    if (!sql || !sql.trim()) {
      this.previewPanel.setPlaceholder();
      return;
    }

    const result = this.formatter.format(sql, this.config);

    if (result.error) {
      const highlighted = this.highlighter.highlight(result.text, this.config.dialect);
      this.previewPanel.setContent(highlighted);
      this.previewPanel.setError(result.error);
      return;
    }

    const highlighted = this.highlighter.highlight(result.text, this.config.dialect);
    this.previewPanel.setContent(highlighted);
  }

  private applyFontSize(size: number): void {
    const safeSize = Math.max(10, Math.min(24, size));
    document.documentElement.style.setProperty('--editor-font-size', `${safeSize}px`);
  }
}
