import { ref } from 'vue';
import { defineStore } from 'pinia';
import { watchDebounced } from '@vueuse/core';
import { Formatter } from '../formatter/Formatter';
import { Highlighter } from '../highlighter/Highlighter';
import { DEFAULT_CONFIG } from '../types/index';
import type { FormatterConfig } from '../types/index';

const formatter = new Formatter();
const highlighter = new Highlighter();

export const useFormatterStore = defineStore('formatter', () => {
  const sql = ref('');
  const config = ref<FormatterConfig>({ ...DEFAULT_CONFIG });
  const outputHtml = ref('');
  const errorMessage = ref<string | undefined>(undefined);
  /** True while restoring from history — suppresses markDirty */
  const isRestoringFromHistory = ref(false);

  function runPipeline(): void {
    if (!sql.value.trim()) {
      outputHtml.value = '';
      errorMessage.value = undefined;
      return;
    }
    const result = formatter.format(sql.value, config.value);
    outputHtml.value = highlighter.highlight(result.text, config.value.dialect);
    errorMessage.value = result.error;
  }

  // Debounced pipeline (250ms) — triggers on sql or config change
  watchDebounced(
    [sql, config],
    () => { runPipeline(); },
    { debounce: 250, deep: true },
  );

  return { sql, config, outputHtml, errorMessage, isRestoringFromHistory, runPipeline };
});
