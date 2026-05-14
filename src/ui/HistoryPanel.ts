import type { SqlDocument } from '../types/index';
import { MAX_DOCUMENTS, MAX_SQL_BYTES } from '../types/index';

const STORAGE_KEY = 'sql-formatter-documents';
const ACTIVE_KEY  = 'sql-formatter-active-doc';
const COUNTER_KEY = 'sql-formatter-doc-counter';

/**
 * HistoryPanel — manages named SQL documents (tabs).
 *
 * Design:
 * - Each document has its own SQL content; editing updates the active doc in-place.
 * - Clicking a tab switches the active document (loads its SQL into the editor).
 *   If the current doc has unsaved edits, they are flushed before switching.
 * - "+" button creates a new blank document (up to MAX_DOCUMENTS).
 * - Delete is disabled when only one document remains.
 * - SQL is capped at MAX_SQL_BYTES per document to stay within localStorage limits.
 * - Document numbering uses a monotonic counter so numbers never repeat.
 * - Double-click a tab label to rename; a pencil icon also appears on hover.
 */
export class HistoryPanel {
  private container: HTMLElement;
  private docs: SqlDocument[] = [];
  private activeId: string = '';
  /** Id of the document that has unsaved in-memory edits */
  private dirtyId: string | null = null;
  /** Monotonic counter for document numbering — never resets */
  private docCounter: number = 0;

  private switchCallbacks: Array<(doc: SqlDocument) => void> = [];
  /** Called when a dirty doc needs to be flushed before switching */
  private flushCallbacks: Array<() => void> = [];

  constructor(container: HTMLElement) {
    this.container = container;
    this.loadFromStorage();

    if (this.docs.length === 0) {
      this.docs.push(this.createDoc(''));
    }
    if (!this.docs.find((d) => d.id === this.activeId)) {
      this.activeId = this.docs[0].id;
    }

    this.saveToStorage();
    this.render();
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Update the SQL of the currently active document.
   * Marks the document as dirty (unsaved in-memory state).
   * Call saveActiveSql() to persist immediately.
   */
  updateActiveSql(sql: string): void {
    const doc = this.getActiveDoc();
    if (!doc) return;

    const safe = this.capSql(sql);
    if (doc.sql === safe) {
      // Content matches stored value — clear dirty flag
      this.setDirty(null);
      return;
    }

    doc.sql = safe;
    doc.updatedAt = Date.now();
    this.saveToStorage();
    this.setDirty(null); // saved successfully
  }

  /**
   * Mark the active document as having unsaved edits.
   * Called by AppController on every editor keystroke (before debounce fires).
   */
  markDirty(): void {
    if (this.dirtyId !== this.activeId) {
      this.setDirty(this.activeId);
    }
  }

  /** Returns true if the active document has unsaved edits */
  isDirty(): boolean {
    return this.dirtyId === this.activeId;
  }

  /**
   * Create a new blank document and switch to it.
   * No-op if already at MAX_DOCUMENTS.
   */
  newDocument(): void {
    if (this.docs.length >= MAX_DOCUMENTS) return;
    const doc = this.createDoc('');
    this.docs.push(doc);
    this.setActive(doc.id, true);
  }

  /** Switch to a document by id. Flushes dirty state first. */
  switchTo(id: string): void {
    if (id === this.activeId) return;
    // Flush unsaved edits before leaving current doc
    if (this.dirtyId === this.activeId) {
      this.flushCallbacks.forEach((cb) => cb());
    }
    this.setActive(id, true);
  }

  /** Return the active document, or null */
  getActiveDoc(): SqlDocument | null {
    return this.docs.find((d) => d.id === this.activeId) ?? null;
  }

  /** Return all documents */
  getDocs(): SqlDocument[] {
    return [...this.docs];
  }

  /** Register a callback fired when the active document changes */
  onSwitch(callback: (doc: SqlDocument) => void): void {
    this.switchCallbacks.push(callback);
  }

  /**
   * Register a callback that AppController uses to flush the editor content
   * into the active document before a tab switch.
   */
  onFlushNeeded(callback: () => void): void {
    this.flushCallbacks.push(callback);
  }

  // ── Storage ───────────────────────────────────────────────────────────────

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.docs));
      localStorage.setItem(ACTIVE_KEY, this.activeId);
      localStorage.setItem(COUNTER_KEY, String(this.docCounter));
    } catch {
      while (this.docs.length > 1) {
        this.docs.pop();
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(this.docs));
          localStorage.setItem(ACTIVE_KEY, this.activeId);
          localStorage.setItem(COUNTER_KEY, String(this.docCounter));
          break;
        } catch { /* keep trying */ }
      }
    }
  }

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          this.docs = (parsed as SqlDocument[])
            .filter(
              (d) =>
                d &&
                typeof d.id === 'string' &&
                typeof d.label === 'string' &&
                typeof d.sql === 'string' &&
                typeof d.updatedAt === 'number',
            )
            .slice(0, MAX_DOCUMENTS);
        }
      }
      const activeRaw = localStorage.getItem(ACTIVE_KEY);
      if (activeRaw) this.activeId = activeRaw;

      const counterRaw = localStorage.getItem(COUNTER_KEY);
      if (counterRaw) {
        const n = parseInt(counterRaw, 10);
        if (!Number.isNaN(n)) this.docCounter = n;
      }
    } catch { /* ignore */ }
  }

  // ── Internal helpers ──────────────────────────────────────────────────────

  private createDoc(sql: string): SqlDocument {
    this.docCounter += 1;
    return {
      id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      label: `文档 ${this.docCounter}`,
      sql: this.capSql(sql),
      updatedAt: Date.now(),
    };
  }

  private setActive(id: string, notify: boolean): void {
    this.activeId = id;
    this.saveToStorage();
    this.render();
    if (notify) {
      const doc = this.docs.find((d) => d.id === id);
      if (doc) this.switchCallbacks.forEach((cb) => cb(doc));
    }
  }

  private setDirty(id: string | null): void {
    if (this.dirtyId === id) return;
    this.dirtyId = id;
    this.render(); // update tab dot indicator
  }

  private deleteDoc(id: string): void {
    if (this.docs.length <= 1) return;

    const idx = this.docs.findIndex((d) => d.id === id);
    this.docs = this.docs.filter((d) => d.id !== id);
    if (this.dirtyId === id) this.dirtyId = null;

    if (this.activeId === id) {
      const next = this.docs[Math.min(idx, this.docs.length - 1)];
      this.setActive(next.id, true);
    } else {
      this.saveToStorage();
      this.render();
    }
  }

  private capSql(sql: string): string {
    const bytes = new TextEncoder().encode(sql).length;
    if (bytes <= MAX_SQL_BYTES) return sql;
    let truncated = sql;
    while (new TextEncoder().encode(truncated).length > MAX_SQL_BYTES) {
      truncated = truncated.slice(0, Math.floor(truncated.length * 0.9));
    }
    return truncated;
  }

  // ── Rendering ─────────────────────────────────────────────────────────────

  private render(): void {
    this.container.innerHTML = '';

    const tabList = document.createElement('div');
    tabList.className = 'doc-tab-list';
    tabList.setAttribute('role', 'tablist');
    tabList.setAttribute('aria-label', 'SQL 文档');

    this.docs.forEach((doc) => tabList.appendChild(this.buildTab(doc)));

    if (this.docs.length < MAX_DOCUMENTS) {
      const newBtn = document.createElement('button');
      newBtn.className = 'doc-new-btn';
      newBtn.title = '新建文档';
      newBtn.setAttribute('aria-label', '新建文档');
      newBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2Z" fill="currentColor"/>
      </svg>`;
      newBtn.addEventListener('click', () => this.newDocument());
      tabList.appendChild(newBtn);
    }

    this.container.appendChild(tabList);
  }

  private buildTab(doc: SqlDocument): HTMLElement {
    const isActive = doc.id === this.activeId;
    const isOnly   = this.docs.length === 1;
    const isDirty  = this.dirtyId === doc.id;

    const tab = document.createElement('div');
    tab.className = 'doc-tab' + (isActive ? ' is-active' : '');
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', String(isActive));
    tab.dataset.id = doc.id;

    // ── Label ──────────────────────────────────────────────────────────────
    const labelSpan = document.createElement('span');
    labelSpan.className = 'doc-tab-label';
    labelSpan.textContent = doc.label;
    // Hint for rename — shown in tooltip
    labelSpan.title = '双击重命名';

    // Dirty dot
    if (isDirty) {
      const dot = document.createElement('span');
      dot.className = 'doc-tab-dirty';
      dot.title = '有未保存的修改';
      dot.setAttribute('aria-label', '未保存');
      labelSpan.appendChild(dot);
    }

    tab.addEventListener('click', () => {
      if (!isActive) this.switchTo(doc.id);
    });

    labelSpan.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      this.startRename(doc, tab, labelSpan);
    });

    // ── Action buttons (rename + delete) — visible on hover/active ─────────
    const actions = document.createElement('div');
    actions.className = 'doc-tab-actions';

    // Rename button (pencil icon)
    const renameBtn = document.createElement('button');
    renameBtn.className = 'doc-tab-action-btn doc-tab-rename';
    renameBtn.title = '重命名';
    renameBtn.setAttribute('aria-label', '重命名文档');
    renameBtn.innerHTML = `<svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Z" fill="currentColor"/>
    </svg>`;
    renameBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.startRename(doc, tab, labelSpan);
    });

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'doc-tab-action-btn doc-tab-delete';
    deleteBtn.title = isOnly ? '至少保留一个文档' : '删除文档';
    deleteBtn.setAttribute('aria-label', '删除文档');
    deleteBtn.disabled = isOnly;
    deleteBtn.innerHTML = `<svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" fill="currentColor"/>
    </svg>`;
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!isOnly) this.deleteDoc(doc.id);
    });

    actions.appendChild(renameBtn);
    actions.appendChild(deleteBtn);

    tab.appendChild(labelSpan);
    tab.appendChild(actions);

    return tab;
  }

  private startRename(doc: SqlDocument, tab: HTMLElement, labelSpan: HTMLElement): void {
    if (tab.querySelector('.doc-tab-rename-input')) return;

    const input = document.createElement('input');
    input.className = 'doc-tab-rename-input';
    input.type = 'text';
    input.value = doc.label;
    input.maxLength = 30;
    input.setAttribute('aria-label', '重命名文档');

    tab.replaceChild(input, labelSpan);
    input.focus();
    input.select();

    const commit = () => {
      const newLabel = input.value.trim();
      if (newLabel && newLabel !== doc.label) {
        doc.label = newLabel;
        this.saveToStorage();
      }
      labelSpan.textContent = doc.label;
      labelSpan.title = '双击重命名';
      tab.replaceChild(labelSpan, input);
    };

    input.addEventListener('blur', commit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
      else if (e.key === 'Escape') { tab.replaceChild(labelSpan, input); }
    });
  }
}
