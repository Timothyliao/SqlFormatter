<template>
  <button
    class="layout-toggle-btn"
    :aria-label="ariaLabel"
    :title="ariaLabel"
    @click="uiStore.toggleLayout()"
  >
    <!-- Horizontal (left/right split): two vertical columns -->
    <svg
      v-if="uiStore.layoutDirection === 'horizontal'"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="7.5" height="16" rx="2" stroke="currentColor" stroke-width="1.6"/>
      <rect x="13.5" y="4" width="7.5" height="16" rx="2" stroke="currentColor" stroke-width="1.6"/>
    </svg>
    <!-- Vertical (top/bottom split): two horizontal rows -->
    <svg
      v-else
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect x="4" y="3" width="16" height="7.5" rx="2" stroke="currentColor" stroke-width="1.6"/>
      <rect x="4" y="13.5" width="16" height="7.5" rx="2" stroke="currentColor" stroke-width="1.6"/>
    </svg>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useUiStore } from '../stores/uiStore';

const uiStore = useUiStore();

const ariaLabel = computed(() =>
  uiStore.layoutDirection === 'horizontal' ? '切换为上下分屏' : '切换为左右分屏',
);
</script>
