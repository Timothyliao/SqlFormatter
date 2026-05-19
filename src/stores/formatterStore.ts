import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { watchDebounced } from '@vueuse/core';
import { Formatter } from '../formatter/Formatter';
import { JsonFormatter } from '../formatter/JsonFormatter';
import { StackTraceFormatter } from '../formatter/stacktrace/StackTraceFormatter';
import { Highlighter } from '../highlighter/Highlighter';
import { StackTraceHighlighter } from '../highlighter/StackTraceHighlighter';
import { DEFAULT_CONFIG } from '../types/index';
import type { FormatterConfig, FormatterMode, FormatTarget } from '../types/index';

const formatter = new Formatter();
const jsonFormatter = new JsonFormatter();
const stackTraceFormatter = new StackTraceFormatter();
const highlighter = new Highlighter();
const stackTraceHighlighter = new StackTraceHighlighter();

export const useFormatterStore = defineStore('formatter', () => {
  const sql = ref('');
  const config = ref<FormatterConfig>({ ...DEFAULT_CONFIG });
  const mode = ref<FormatterMode>('sql');
  const outputHtml = ref('');
  const errorMessage = ref<string | undefined>(undefined);
  /** True while restoring from history — suppresses markDirty */
  const isRestoringFromHistory = ref(false);

  /** Derived format target for the single selector in ConfigPanel */
  const formatTarget = computed<FormatTarget>(() => {
    if (mode.value === 'json') return 'json';
    return `sql-${config.value.dialect}` as FormatTarget;
  });

  /** Set mode + dialect from a single FormatTarget value */
  function setFormatTarget(target: FormatTarget): void {
    if (target === 'json') {
      mode.value = 'json';
    } else if (target === 'stacktrace') {
      mode.value = 'stacktrace';
    } else {
      mode.value = 'sql';
      const dialect = target.replace('sql-', '') as FormatterConfig['dialect'];
      config.value = { ...config.value, dialect };
    }
  }

  function runPipeline(): void {
    if (!sql.value.trim()) {
      outputHtml.value = '';
      errorMessage.value = undefined;
      return;
    }

    if (mode.value === 'json') {
      const result = jsonFormatter.format(sql.value, config.value.indentWidth);
      outputHtml.value = result.text ? highlighter.highlight(result.text, 'json') : '';
      errorMessage.value = result.error;
    } else if (mode.value === 'stacktrace') {
      const result = stackTraceFormatter.format(sql.value);
      outputHtml.value = stackTraceHighlighter.highlight(result);
      errorMessage.value = result.error;
    } else {
      const result = formatter.format(sql.value, config.value);
      outputHtml.value = highlighter.highlight(result.text, config.value.dialect);
      errorMessage.value = result.error;
    }
  }

  // Debounced pipeline (250ms) — triggers on sql, config, or mode change
  watchDebounced(
    [sql, config, mode],
    () => { runPipeline(); },
    { debounce: 250, deep: true },
  );

  return {
    sql, config, mode, formatTarget,
    outputHtml, errorMessage, isRestoringFromHistory,
    runPipeline, setFormatTarget,
  };
});
