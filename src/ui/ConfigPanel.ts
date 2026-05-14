import type { FormatterConfig, SqlDialect, KeywordCase, CommaPosition } from '../types/index';
import { DEFAULT_CONFIG, DEFAULT_FONT_SIZE } from '../types/index';

const STORAGE_KEY = 'sql-formatter-config';

/**
 * ConfigPanel — dialect selector stays in the header bar;
 * all other settings are accessible via a ⚙ button that opens a modal dialog.
 * Settings are persisted to localStorage only when user clicks "保存设置".
 */
export class ConfigPanel {
  private container: HTMLElement;

  // Controls exposed in the header bar
  private dialectSelect!: HTMLSelectElement;

  // Controls inside the settings modal (pending — not applied until Save)
  private indentSelect!: HTMLSelectElement;
  private valuesInput!: HTMLInputElement;
  private keywordCaseSelect!: HTMLSelectElement;
  private commaPositionSelect!: HTMLSelectElement;
  private linesBetweenSelect!: HTMLSelectElement;
  private fontSizeInput!: HTMLInputElement;

  // Modal elements
  private modal!: HTMLElement;
  private overlay!: HTMLElement;
  private settingsBtn!: HTMLButtonElement;

  private changeCallbacks: Array<(config: FormatterConfig) => void> = [];
  private fontSizeCallbacks: Array<(size: number) => void> = [];

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
    this.loadFromStorage();
  }

  private render(): void {
    this.container.className = 'config-panel-inner';

    // ── Dialect (stays in header) ─────────────────────────────────────────
    const dialectGroup = this.createGroup('语言');
    this.dialectSelect = document.createElement('select');
    this.dialectSelect.className = 'config-select';
    this.dialectSelect.setAttribute('aria-label', 'SQL 语言');

    const dialects: { value: SqlDialect; label: string }[] = [
      { value: 'postgresql', label: 'PostgreSQL' },
      { value: 'mysql', label: 'MySQL' },
      { value: 'sqlite', label: 'SQLite' },
    ];
    dialects.forEach(({ value, label }) => {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = label;
      if (value === DEFAULT_CONFIG.dialect) opt.selected = true;
      this.dialectSelect.appendChild(opt);
    });
    dialectGroup.appendChild(this.dialectSelect);
    this.container.appendChild(dialectGroup);

    // ── Settings button ───────────────────────────────────────────────────
    this.settingsBtn = document.createElement('button');
    this.settingsBtn.className = 'settings-btn';
    this.settingsBtn.setAttribute('aria-label', '打开格式化设置');
    this.settingsBtn.title = '格式化设置';
    this.settingsBtn.innerHTML = `
      <svg class="settings-btn-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
      <span class="settings-btn-label">设置</span>`;
    this.settingsBtn.addEventListener('click', () => this.openModal());
    this.container.appendChild(this.settingsBtn);

    // ── Modal overlay + dialog ────────────────────────────────────────────
    this.overlay = document.createElement('div');
    this.overlay.className = 'settings-overlay';
    this.overlay.setAttribute('aria-hidden', 'true');
    this.overlay.addEventListener('click', () => this.closeModal());

    this.modal = document.createElement('div');
    this.modal.className = 'settings-modal';
    this.modal.setAttribute('role', 'dialog');
    this.modal.setAttribute('aria-modal', 'true');
    this.modal.setAttribute('aria-label', '格式化设置');

    // Modal header
    const modalHeader = document.createElement('div');
    modalHeader.className = 'settings-modal-header';
    const modalTitle = document.createElement('h2');
    modalTitle.className = 'settings-modal-title';
    modalTitle.textContent = '格式化设置';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'settings-modal-close';
    closeBtn.setAttribute('aria-label', '关闭设置');
    closeBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>`;
    closeBtn.addEventListener('click', () => this.closeModal());
    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeBtn);

    // Modal body with sections
    const modalBody = document.createElement('div');
    modalBody.className = 'settings-modal-body';

    // ── Section: 格式化 ───────────────────────────────────────────────────
    modalBody.appendChild(this.createSection('格式化', [
      this.createModalRow('缩进宽度', () => {
        this.indentSelect = document.createElement('select');
        this.indentSelect.className = 'config-select';
        this.indentSelect.setAttribute('aria-label', '缩进宽度');
        [2, 4].forEach((w) => {
          const opt = document.createElement('option');
          opt.value = String(w);
          opt.textContent = `${w} 空格`;
          if (w === DEFAULT_CONFIG.indentWidth) opt.selected = true;
          this.indentSelect.appendChild(opt);
        });
        return this.indentSelect;
      }),
      this.createModalRow('关键字大小写', () => {
        this.keywordCaseSelect = document.createElement('select');
        this.keywordCaseSelect.className = 'config-select';
        this.keywordCaseSelect.setAttribute('aria-label', '关键字大小写');
        const cases: { value: KeywordCase; label: string }[] = [
          { value: 'upper', label: '大写 (UPPER)' },
          { value: 'lower', label: '小写 (lower)' },
          { value: 'preserve', label: '保留原样' },
        ];
        cases.forEach(({ value, label }) => {
          const opt = document.createElement('option');
          opt.value = value;
          opt.textContent = label;
          if (value === DEFAULT_CONFIG.keywordCase) opt.selected = true;
          this.keywordCaseSelect.appendChild(opt);
        });
        return this.keywordCaseSelect;
      }),
      this.createModalRow('逗号位置', () => {
        this.commaPositionSelect = document.createElement('select');
        this.commaPositionSelect.className = 'config-select';
        this.commaPositionSelect.setAttribute('aria-label', '逗号位置');
        const positions: { value: CommaPosition; label: string }[] = [
          { value: 'after', label: '行尾（a,）' },
          { value: 'before', label: '行首（,a）' },
        ];
        positions.forEach(({ value, label }) => {
          const opt = document.createElement('option');
          opt.value = value;
          opt.textContent = label;
          if (value === DEFAULT_CONFIG.commaPosition) opt.selected = true;
          this.commaPositionSelect.appendChild(opt);
        });
        return this.commaPositionSelect;
      }),
      this.createModalRow('语句间空行', () => {
        this.linesBetweenSelect = document.createElement('select');
        this.linesBetweenSelect.className = 'config-select';
        this.linesBetweenSelect.setAttribute('aria-label', '多语句间空行数');
        [1, 2].forEach((n) => {
          const opt = document.createElement('option');
          opt.value = String(n);
          opt.textContent = `${n} 行`;
          if (n === DEFAULT_CONFIG.linesBetweenQueries) opt.selected = true;
          this.linesBetweenSelect.appendChild(opt);
        });
        return this.linesBetweenSelect;
      }),
      this.createModalRow('IN 每行值数', () => {
        this.valuesInput = document.createElement('input');
        this.valuesInput.type = 'number';
        this.valuesInput.className = 'config-number';
        this.valuesInput.min = '1';
        this.valuesInput.max = '100';
        this.valuesInput.value = String(DEFAULT_CONFIG.valuesPerLine);
        this.valuesInput.setAttribute('aria-label', 'IN 子句每行值数量');
        return this.valuesInput;
      }),
    ]));

    // ── Section: 显示 ─────────────────────────────────────────────────────
    modalBody.appendChild(this.createSection('显示', [
      this.createModalRow('字体大小 (px)', () => {
        this.fontSizeInput = document.createElement('input');
        this.fontSizeInput.type = 'number';
        this.fontSizeInput.className = 'config-number';
        this.fontSizeInput.min = '10';
        this.fontSizeInput.max = '24';
        this.fontSizeInput.value = String(DEFAULT_FONT_SIZE);
        this.fontSizeInput.setAttribute('aria-label', '编辑器与预览字体大小（px）');
        return this.fontSizeInput;
      }),
    ]));

    this.modal.appendChild(modalHeader);
    this.modal.appendChild(modalBody);

    // ── Modal footer (Save button) ────────────────────────────────────────
    const modalFooter = document.createElement('div');
    modalFooter.className = 'settings-modal-footer';

    const saveBtn = document.createElement('button');
    saveBtn.className = 'settings-save-btn';
    saveBtn.textContent = '应用';
    saveBtn.title = '应用格式化配置';
    saveBtn.addEventListener('click', () => {
      this.applyAndSave();
      this.closeModal();
    });
    modalFooter.appendChild(saveBtn);
    this.modal.appendChild(modalFooter);

    // Append to body so modal is above everything
    document.body.appendChild(this.overlay);
    document.body.appendChild(this.modal);

    // ── Event listeners ───────────────────────────────────────────────────
    // Dialect change fires immediately (stays outside modal)
    this.dialectSelect.addEventListener('change', () => {
      const config = this.getConfig();
      this.saveToStorage();
      this.changeCallbacks.forEach((cb) => cb(config));
    });

    // Close modal on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal.classList.contains('is-open')) {
        this.closeModal();
      }
    });
  }

  private createSection(title: string, rows: HTMLElement[]): HTMLElement {
    const section = document.createElement('div');
    section.className = 'settings-section';
    const heading = document.createElement('h3');
    heading.className = 'settings-section-title';
    heading.textContent = title;
    section.appendChild(heading);
    rows.forEach((row) => section.appendChild(row));
    return section;
  }

  private createModalRow(label: string, buildControl: () => HTMLElement): HTMLElement {
    const row = document.createElement('div');
    row.className = 'settings-row';
    const lbl = document.createElement('label');
    lbl.className = 'settings-row-label';
    lbl.textContent = label;
    const control = buildControl();
    lbl.htmlFor = control.id || '';
    row.appendChild(lbl);
    row.appendChild(control);
    return row;
  }

  private createGroup(label: string): HTMLElement {
    const group = document.createElement('div');
    group.className = 'config-group';
    const lbl = document.createElement('label');
    lbl.className = 'config-label';
    lbl.textContent = label;
    group.appendChild(lbl);
    return group;
  }

  private openModal(): void {
    this.overlay.setAttribute('aria-hidden', 'false');
    this.overlay.classList.add('is-open');
    // Force reflow so transition plays from initial state
    this.modal.style.display = 'flex';
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    this.modal.offsetHeight; // trigger reflow
    this.modal.classList.add('is-open');
    this.settingsBtn.classList.add('is-active');
  }

  private closeModal(): void {
    this.modal.classList.remove('is-open');
    this.overlay.classList.remove('is-open');
    this.overlay.setAttribute('aria-hidden', 'true');
    this.settingsBtn.classList.remove('is-active');
    // Hide after transition ends
    const onEnd = () => {
      if (!this.modal.classList.contains('is-open')) {
        this.modal.style.display = '';
      }
      this.modal.removeEventListener('transitionend', onEnd);
    };
    this.modal.addEventListener('transitionend', onEnd);
  }

  /** Apply pending modal values, fire callbacks, persist to storage */
  private applyAndSave(): void {
    const config = this.getConfig();
    const fontSize = this.getFontSize();
    this.saveToStorage();
    this.changeCallbacks.forEach((cb) => cb(config));
    this.fontSizeCallbacks.forEach((cb) => cb(fontSize));
  }

  // ── localStorage persistence ──────────────────────────────────────────────

  private saveToStorage(): void {
    try {
      const data = {
        config: this.getConfig(),
        fontSize: this.getFontSize(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch { /* ignore */ }
  }

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as { config?: Partial<FormatterConfig>; fontSize?: number };

      if (data.config) {
        const c = data.config;
        if (c.dialect && ['postgresql', 'mysql', 'sqlite'].includes(c.dialect)) {
          this.dialectSelect.value = c.dialect;
        }
        if (c.indentWidth && [2, 4].includes(c.indentWidth)) {
          this.indentSelect.value = String(c.indentWidth);
        }
        if (c.keywordCase && ['upper', 'lower', 'preserve'].includes(c.keywordCase)) {
          this.keywordCaseSelect.value = c.keywordCase;
        }
        if (c.commaPosition && ['before', 'after'].includes(c.commaPosition)) {
          this.commaPositionSelect.value = c.commaPosition;
        }
        if (c.linesBetweenQueries && [1, 2].includes(c.linesBetweenQueries)) {
          this.linesBetweenSelect.value = String(c.linesBetweenQueries);
        }
        if (typeof c.valuesPerLine === 'number' && c.valuesPerLine >= 1 && c.valuesPerLine <= 100) {
          this.valuesInput.value = String(c.valuesPerLine);
        }
      }

      if (typeof data.fontSize === 'number' && data.fontSize >= 10 && data.fontSize <= 24) {
        this.fontSizeInput.value = String(data.fontSize);
      }
    } catch { /* ignore */ }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /** Return the current configuration reflected by the UI controls */
  getConfig(): FormatterConfig {
    const rawValues = parseInt(this.valuesInput.value, 10);
    const valuesPerLine = Number.isNaN(rawValues)
      ? DEFAULT_CONFIG.valuesPerLine
      : Math.max(1, Math.min(100, rawValues));

    return {
      dialect: this.dialectSelect.value as SqlDialect,
      indentWidth: (parseInt(this.indentSelect.value, 10) as 2 | 4) ?? 2,
      valuesPerLine,
      keywordCase: this.keywordCaseSelect.value as KeywordCase,
      commaPosition: this.commaPositionSelect.value as CommaPosition,
      linesBetweenQueries: (parseInt(this.linesBetweenSelect.value, 10) as 1 | 2) ?? 1,
    };
  }

  /** Register a callback that fires whenever any config control changes */
  onConfigChange(callback: (config: FormatterConfig) => void): void {
    this.changeCallbacks.push(callback);
  }

  /** Register a callback that fires whenever the font size changes */
  onFontSizeChange(callback: (size: number) => void): void {
    this.fontSizeCallbacks.push(callback);
  }

  /** Return the current font size in px */
  getFontSize(): number {
    const raw = parseInt(this.fontSizeInput.value, 10);
    return Number.isNaN(raw) ? DEFAULT_FONT_SIZE : Math.max(10, Math.min(24, raw));
  }
}
