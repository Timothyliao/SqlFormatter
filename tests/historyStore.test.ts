/**
 * historyStore.test.ts — tests for document management store
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useHistoryStore } from '../src/stores/historyStore';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('historyStore', () => {
  beforeEach(() => {
    localStorageMock.clear();
    setActivePinia(createPinia());
  });

  it('initializes with one document', () => {
    const store = useHistoryStore();
    expect(store.docs).toHaveLength(1);
    expect(store.activeId).toBeTruthy();
  });

  it('getActiveDoc returns the active document', () => {
    const store = useHistoryStore();
    const doc = store.getActiveDoc();
    expect(doc).not.toBeNull();
    expect(doc!.id).toBe(store.activeId);
  });

  it('markDirty sets dirtyId to activeId', () => {
    const store = useHistoryStore();
    store.markDirty();
    expect(store.dirtyId).toBe(store.activeId);
  });

  it('saveActiveDoc clears dirtyId', () => {
    const store = useHistoryStore();
    store.markDirty();
    expect(store.dirtyId).toBe(store.activeId);
    store.saveActiveDoc('SELECT 1');
    expect(store.dirtyId).toBeNull();
  });

  it('saveActiveDoc updates doc sql', () => {
    const store = useHistoryStore();
    store.saveActiveDoc('SELECT 42');
    const doc = store.getActiveDoc();
    expect(doc!.sql).toBe('SELECT 42');
  });

  it('newDocument adds a document', () => {
    const store = useHistoryStore();
    store.newDocument();
    expect(store.docs).toHaveLength(2);
  });

  it('newDocument switches activeId to new doc', () => {
    const store = useHistoryStore();
    const oldId = store.activeId;
    store.newDocument();
    expect(store.activeId).not.toBe(oldId);
  });

  it('deleteDoc removes a document', () => {
    const store = useHistoryStore();
    store.newDocument();
    expect(store.docs).toHaveLength(2);
    const idToDelete = store.docs[1]!.id;
    store.deleteDoc(idToDelete);
    expect(store.docs).toHaveLength(1);
  });

  it('deleteDoc does not remove last document', () => {
    const store = useHistoryStore();
    expect(store.docs).toHaveLength(1);
    store.deleteDoc(store.activeId);
    expect(store.docs).toHaveLength(1);
  });

  it('renameDoc updates label', () => {
    const store = useHistoryStore();
    const id = store.activeId;
    store.renameDoc(id, '我的查询');
    const doc = store.docs.find((d) => d.id === id);
    expect(doc!.label).toBe('我的查询');
  });

  it('switchTo calls flushFn when dirty', () => {
    const store = useHistoryStore();
    store.newDocument();
    const [doc1, doc2] = store.docs;

    // Switch to doc1
    store.activeId = doc1!.id;
    store.markDirty();

    const flushFn = vi.fn();
    store.switchTo(doc2!.id, flushFn);

    expect(flushFn).toHaveBeenCalledOnce();
  });

  it('switchTo does nothing when switching to same id', () => {
    const store = useHistoryStore();
    const id = store.activeId;
    const flushFn = vi.fn();
    const result = store.switchTo(id, flushFn);
    expect(flushFn).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('switchTo returns new doc sql', () => {
    const store = useHistoryStore();
    store.newDocument();
    const [doc1, doc2] = store.docs;
    store.activeId = doc1!.id;
    store.saveActiveDoc('SELECT 1');

    const result = store.switchTo(doc2!.id, vi.fn());
    expect(result).toBe('');
  });
});
