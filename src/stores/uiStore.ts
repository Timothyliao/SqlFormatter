import { ref, watch } from 'vue';
import { defineStore } from 'pinia';
import { useLocalStorage } from '@vueuse/core';
import { DEFAULT_FONT_SIZE } from '../types/index';

export type LayoutDirection = 'horizontal' | 'vertical';

export const useUiStore = defineStore('ui', () => {
  const fontSize = useLocalStorage<number>('sql-formatter-font-size', DEFAULT_FONT_SIZE);

  watch(
    fontSize,
    (size) => {
      const safe = Math.max(10, Math.min(24, size));
      document.documentElement.style.setProperty('--editor-font-size', `${safe}px`);
    },
    { immediate: true },
  );

  /** Left panel width percentage (20–80). Written by ResizableDivider. */
  const leftPanelPct = ref(50);

  /** Layout direction: 'horizontal' = left/right, 'vertical' = top/bottom */
  const layoutDirection = useLocalStorage<LayoutDirection>('sql-formatter-layout-direction', 'horizontal');

  function toggleLayout(): void {
    layoutDirection.value = layoutDirection.value === 'horizontal' ? 'vertical' : 'horizontal';
  }

  return { fontSize, leftPanelPct, layoutDirection, toggleLayout };
});
