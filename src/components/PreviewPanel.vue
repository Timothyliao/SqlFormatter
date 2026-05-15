<template>
  <div class="preview-wrapper">
    <!-- Gutter -->
    <div class="preview-gutter">
      <template v-if="blocks.length <= 1">
        <div
          v-for="row in simpleGutterRows"
          :key="row.key"
          class="gutter-row"
        >
          <span class="gutter-num">{{ row.lineNum }}</span>
        </div>
      </template>
      <template v-else>
        <div
          v-for="row in gutterRows"
          :key="row.key"
          class="gutter-row"
        >
          <span class="gutter-num">{{ row.lineNum }}</span>
          <button
            v-if="row.foldable && row.blockIdx >= 0"
            class="gutter-fold"
            :aria-label="collapsed[row.blockIdx] ? '展开语句' : '折叠语句'"
            @click.stop="toggleBlock(row.blockIdx)"
          >
            {{ collapsed[row.blockIdx] ? '▶' : '▼' }}
          </button>
        </div>
      </template>
    </div>

    <!-- Code area -->
    <pre
      ref="previewWrapperRef"
      class="preview-code"
      :class="{ 'is-placeholder': isPlaceholder }"
    ><code v-html="renderedHtml" /></pre>
  </div>

  <!-- Error banner -->
  <div
    v-if="errorMessage"
    class="preview-error"
    role="alert"
    aria-live="polite"
  >
    ⚠ {{ errorMessage }}
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useFormatterStore } from '../stores/formatterStore';
import {
  parseBlocks,
  buildGutterRows,
  buildCodeHtml,
  buildSimpleGutterRows,
  getPlainTextFromBlocks,
} from '../utils/previewParser';
import type { StatementBlock } from '../utils/previewParser';

const formatterStore = useFormatterStore();

const collapsed = ref<boolean[]>([]);
const previewWrapperRef = ref<HTMLElement | null>(null);

// Re-parse blocks whenever outputHtml changes; reset collapsed state
const blocks = computed<StatementBlock[]>(() => {
  return parseBlocks(formatterStore.outputHtml);
});

// Reset collapsed when blocks change
watch(blocks, (newBlocks) => {
  collapsed.value = newBlocks.map(() => false);
}, { immediate: true });

const gutterRows = computed(() => buildGutterRows(blocks.value, collapsed.value));

const simpleGutterRows = computed(() => {
  if (!formatterStore.outputHtml) return [];
  const lineCount = formatterStore.outputHtml.replace(/<[^>]*>/g, '').split('\n').length;
  return buildSimpleGutterRows(lineCount);
});

const renderedHtml = computed(() => {
  if (!formatterStore.sql.trim()) {
    return '格式化结果将在此处显示…';
  }
  if (blocks.value.length === 0 && formatterStore.outputHtml) {
    return formatterStore.outputHtml;
  }
  if (blocks.value.length <= 1) {
    return formatterStore.outputHtml || '';
  }
  return buildCodeHtml(blocks.value, collapsed.value);
});

const isPlaceholder = computed(() => !formatterStore.sql.trim());
const errorMessage = computed(() => formatterStore.errorMessage);

function toggleBlock(idx: number): void {
  const next = [...collapsed.value];
  next[idx] = !next[idx];
  collapsed.value = next;
}

// ── Exposed API (for App.vue shortcuts and CopyButton) ───────────────────────

function foldAll(): void {
  if (blocks.value.length < 2) return;
  collapsed.value = blocks.value.map(
    (b) => b.htmlLines.length - b.leadingCommentCount > 1,
  );
}

function unfoldAll(): void {
  if (blocks.value.length < 2) return;
  collapsed.value = blocks.value.map(() => false);
}

function getPlainText(): string {
  if (blocks.value.length === 0) {
    return formatterStore.outputHtml.replace(/<[^>]*>/g, '') || '';
  }
  return getPlainTextFromBlocks(blocks.value);
}

function scrollToTop(): void {
  const el = previewWrapperRef.value?.closest('.panel-body') as HTMLElement | null;
  if (el) el.scrollTop = 0;
}

function scrollToBottom(): void {
  const el = previewWrapperRef.value?.closest('.panel-body') as HTMLElement | null;
  if (el) el.scrollTop = el.scrollHeight;
}

defineExpose({ foldAll, unfoldAll, getPlainText, scrollToTop, scrollToBottom });
</script>
