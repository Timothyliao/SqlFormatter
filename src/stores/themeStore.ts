import { watch } from 'vue';
import { defineStore } from 'pinia';
import { useLocalStorage } from '@vueuse/core';
import type { AppTheme } from '../types/index';

export const useThemeStore = defineStore('theme', () => {
  const theme = useLocalStorage<AppTheme>(
    'sql-formatter-theme',
    () => (window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'),
  );

  watch(
    theme,
    (t) => {
      document.documentElement.setAttribute('data-theme', t);
    },
    { immediate: true },
  );

  return { theme };
});
