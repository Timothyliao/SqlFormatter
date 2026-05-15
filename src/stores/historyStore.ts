import { ref } from 'vue';
import { defineStore } from 'pinia';
import { MAX_DOCUMENTS, MAX_SQL_BYTES } from '../types/index';
import type { SqlDocument } from '../types/index';

const STORAGE_KEY = 'sql-formatter-documents';
const ACTIVE_KEY = 'sql-formatter-active-doc';
const COUNTER_KEY = 'sql-formatter-doc-counter';

/** Truncate SQL to MAX_SQL_BYTES */
function capSql(sql: string): string {
  const bytes = new TextEncoder().encode(sql).length;
  if (bytes <= MAX_SQL_BYTES) return sql;
  let truncated = sql;
  while (new TextEncoder().encode(truncated).length > MAX_SQL_BYTES) {
    truncated = truncated.slice(0, Math.floor(truncated.length * 0.9));
  }
  return truncated;
}

function loadFromStorage(): { docs: SqlDocument[]; activeId: string; docCounter: number } {
  let docs: SqlDocument[] = [];
  let activeId = '';
  let docCounter = 0;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        docs = (parsed as SqlDocument[])
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
    if (activeRaw) activeId = activeRaw;
    const counterRaw = localStorage.getItem(COUNTER_KEY);
    if (counterRaw) {
      const n = parseInt(counterRaw, 10);
      if (!Number.isNaN(n)) docCounter = n;
    }
  } catch { /* ignore */ }
  return { docs, activeId, docCounter };
}

export type SaveStatus = 'idle' | 'saved' | 'error';

export const useHistoryStore = defineStore('history', () => {
  const stored = loadFromStorage();

  const docs = ref<SqlDocument[]>(stored.docs);
  const activeId = ref<string>(stored.activeId);
  const dirtyId = ref<string | null>(null);
  const docCounter = ref<number>(stored.docCounter);
  const saveStatus = ref<SaveStatus>('idle');

  let saveStatusTimer: ReturnType<typeof setTimeout> | null = null;

  function setSaveStatus(status: SaveStatus): void {
    if (saveStatusTimer !== null) { clearTimeout(saveStatusTimer); saveStatusTimer = null; }
    saveStatus.value = status;
    if (status !== 'idle') {
      saveStatusTimer = setTimeout(() => { saveStatus.value = 'idle'; }, 1500);
    }
  }

  // Ensure at least one document exists
  if (docs.value.length === 0) {
    docCounter.value += 1;
    docs.value.push({
      id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      label: `文档 ${docCounter.value}`,
      sql: '',
      updatedAt: Date.now(),
    });
  }
  if (!docs.value.find((d) => d.id === activeId.value)) {
    activeId.value = docs.value[0]!.id;
  }

  function saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(docs.value));
      localStorage.setItem(ACTIVE_KEY, activeId.value);
      localStorage.setItem(COUNTER_KEY, String(docCounter.value));
    } catch {
      while (docs.value.length > 1) {
        docs.value.pop();
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(docs.value));
          localStorage.setItem(ACTIVE_KEY, activeId.value);
          localStorage.setItem(COUNTER_KEY, String(docCounter.value));
          break;
        } catch { /* keep trying */ }
      }
    }
  }

  function getActiveDoc(): SqlDocument | null {
    return docs.value.find((d) => d.id === activeId.value) ?? null;
  }

  function markDirty(): void {
    dirtyId.value = activeId.value;
  }

  function saveActiveDoc(sql: string): void {
    const doc = getActiveDoc();
    if (!doc) return;
    const safe = capSql(sql);
    if (doc.sql === safe) {
      dirtyId.value = null;
      setSaveStatus('saved');
      return;
    }
    try {
      doc.sql = safe;
      doc.updatedAt = Date.now();
      saveToStorage();
      dirtyId.value = null;
      setSaveStatus('saved');
    } catch {
      setSaveStatus('error');
    }
  }

  /**
   * Switch to a document by id.
   * flushFn: called first to persist current editor content.
   * Returns the new active doc's sql so the caller can update formatterStore.
   */
  function switchTo(id: string, flushFn: () => void): string | null {
    if (id === activeId.value) return null;

    // Flush current doc if dirty
    if (dirtyId.value === activeId.value) {
      flushFn();
    }

    activeId.value = id;
    saveToStorage();

    const doc = getActiveDoc();
    return doc ? doc.sql : null;
  }

  function newDocument(): string {
    if (docs.value.length >= MAX_DOCUMENTS) return '';
    docCounter.value += 1;
    const doc: SqlDocument = {
      id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      label: `文档 ${docCounter.value}`,
      sql: '',
      updatedAt: Date.now(),
    };
    docs.value.push(doc);
    activeId.value = doc.id;
    saveToStorage();
    return '';
  }

  /**
   * Delete a document. Returns the new active doc's sql (if active changed).
   */
  function deleteDoc(id: string): string | null {
    if (docs.value.length <= 1) return null;
    const idx = docs.value.findIndex((d) => d.id === id);
    docs.value = docs.value.filter((d) => d.id !== id);
    if (dirtyId.value === id) dirtyId.value = null;

    if (activeId.value === id) {
      const next = docs.value[Math.min(idx, docs.value.length - 1)];
      if (next) {
        activeId.value = next.id;
        saveToStorage();
        return next.sql;
      }
    } else {
      saveToStorage();
    }
    return null;
  }

  function renameDoc(id: string, label: string): void {
    const doc = docs.value.find((d) => d.id === id);
    if (!doc) return;
    doc.label = label;
    saveToStorage();
  }

  // Persist on init
  saveToStorage();

  return {
    docs,
    activeId,
    dirtyId,
    docCounter,
    saveStatus,
    getActiveDoc,
    markDirty,
    saveActiveDoc,
    switchTo,
    newDocument,
    deleteDoc,
    renameDoc,
  };
});
