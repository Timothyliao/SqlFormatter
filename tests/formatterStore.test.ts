/**
 * formatterStore.test.ts — tests for formatter pipeline store
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useFormatterStore } from '../src/stores/formatterStore';

describe('formatterStore pipeline', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
  });

  it('initial state is empty', () => {
    const store = useFormatterStore();
    expect(store.sql).toBe('');
    expect(store.outputHtml).toBe('');
    expect(store.errorMessage).toBeUndefined();
    expect(store.isRestoringFromHistory).toBe(false);
  });

  it('runPipeline() with empty sql sets outputHtml to empty', () => {
    const store = useFormatterStore();
    store.sql = '';
    store.runPipeline();
    expect(store.outputHtml).toBe('');
    expect(store.errorMessage).toBeUndefined();
  });

  it('runPipeline() with valid sql sets outputHtml', () => {
    const store = useFormatterStore();
    store.sql = 'SELECT 1';
    store.runPipeline();
    expect(store.outputHtml.length).toBeGreaterThan(0);
    expect(store.errorMessage).toBeUndefined();
  });

  it('runPipeline() with whitespace-only sql sets outputHtml to empty', () => {
    const store = useFormatterStore();
    store.sql = '   \n  ';
    store.runPipeline();
    expect(store.outputHtml).toBe('');
  });

  it('isRestoringFromHistory flag is writable', () => {
    const store = useFormatterStore();
    store.isRestoringFromHistory = true;
    expect(store.isRestoringFromHistory).toBe(true);
    store.isRestoringFromHistory = false;
    expect(store.isRestoringFromHistory).toBe(false);
  });

  it('config changes are reflected in runPipeline output', () => {
    const store = useFormatterStore();
    store.sql = 'select id from users';
    store.config = { ...store.config, keywordCase: 'upper' };
    store.runPipeline();
    const upperOutput = store.outputHtml;

    store.config = { ...store.config, keywordCase: 'lower' };
    store.runPipeline();
    const lowerOutput = store.outputHtml;

    expect(upperOutput).not.toBe(lowerOutput);
  });
});
