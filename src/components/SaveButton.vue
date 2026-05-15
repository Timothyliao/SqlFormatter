<template>
  <button
    class="copy-btn"
    :class="btnClass"
    aria-label="保存文档 (Ctrl+S)"
    type="button"
    title="Ctrl+S"
    @click="handleClick"
  >
    {{ label }}
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useHistoryStore } from '../stores/historyStore';
import { useFormatterStore } from '../stores/formatterStore';

const historyStore = useHistoryStore();
const formatterStore = useFormatterStore();

const LABELS = {
  idle: '保存',
  saved: '已保存 ✓',
  error: '保存失败',
} as const;

const label = computed(() => LABELS[historyStore.saveStatus]);

const btnClass = computed(() => {
  if (historyStore.saveStatus === 'saved') return 'copy-btn--success';
  if (historyStore.saveStatus === 'error') return 'copy-btn--error';
  return '';
});

function handleClick(): void {
  historyStore.saveActiveDoc(formatterStore.sql);
}
</script>
