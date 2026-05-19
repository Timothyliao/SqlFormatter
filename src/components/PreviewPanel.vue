<template>
  <div class="preview-wrapper">
    <!-- Gutter -->
    <div class="preview-gutter">
      <!-- JSON mode: fold by node -->
      <template v-if="isSqlMode">
        <template v-if="blocks.length <= 1">
          <div v-for="row in simpleGutterRows" :key="row.key" class="gutter-row">
            <span class="gutter-num">{{ row.lineNum }}</span>
          </div>
        </template>
        <template v-else>
          <div v-for="row in gutterRows" :key="row.key" class="gutter-row">
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
      </template>
      <template v-else>
        <div v-for="row in jsonGutterRows" :key="row.key" class="gutter-row">
          <span class="gutter-num">{{ row.lineNum }}</span>
          <button
            v-if="row.foldable && row.blockIdx >= 0"
            class="gutter-fold"
            :aria-label="jsonCollapsed.get(row.blockIdx) ? '展开' : '折叠'"
            @click.stop="toggleJsonNode(row.blockIdx)"
          >
            {{ jsonCollapsed.get(row.blockIdx) ? '▶' : '▼' }}
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
  <div v-if="errorMessage" class="preview-error" role="alert" aria-live="polite">
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
  parseJsonNodes,
  buildJsonGutterRows,
  buildJsonCodeHtml,
  unescapeHtml,
} from '../utils/previewParser';
import type { StatementBlock, JsonFoldNode } from '../utils/previewParser';

const formatterStore = useFormatterStore();

// ── SQL mode state ────────────────────────────────────────────────────────────

const collapsed = ref<boolean[]>([]);
const previewWrapperRef = ref<HTMLElement | null>(null);

const isSqlMode = computed(() => formatterStore.mode === 'sql');

const blocks = computed<StatementBlock[]>(() =>
  isSqlMode.value ? parseBlocks(formatterStore.outputHtml) : [],
);

watch(blocks, (newBlocks) => {
  collapsed.value = newBlocks.map(() => false);
}, { immediate: true });

const gutterRows = computed(() => buildGutterRows(blocks.value, collapsed.value));

const simpleGutterRows = computed(() => {
  if (!formatterStore.outputHtml) return [];
  const lineCount = formatterStore.outputHtml.replace(/<[^>]*>/g, '').split('\n').length;
  return buildSimpleGutterRows(lineCount);
});

// ── JSON mode state ───────────────────────────────────────────────────────────

/** collapsed Map: key = startLine (1-based) */
const jsonCollapsed = ref<Map<number, boolean>>(new Map());

const jsonPlainLines = computed<string[]>(() => {
  if (isSqlMode.value || !formatterStore.outputHtml) return [];
  return formatterStore.outputHtml.replace(/<[^>]*>/g, '').split('\n');
});

const jsonHtmlLines = computed<string[]>(() => {
  if (isSqlMode.value || !formatterStore.outputHtml) return [];
  return formatterStore.outputHtml.split('\n');
});

const jsonNodes = computed<JsonFoldNode[]>(() => {
  if (isSqlMode.value) return [];
  return parseJsonNodes(jsonPlainLines.value.join('\n'));
});

// Reset collapsed when JSON nodes change
watch(jsonNodes, () => {
  jsonCollapsed.value = new Map();
}, { immediate: true });

const jsonGutterRows = computed(() =>
  buildJsonGutterRows(jsonHtmlLines.value.length, jsonNodes.value, jsonCollapsed.value),
);

// ── Rendered HTML ─────────────────────────────────────────────────────────────

const renderedHtml = computed(() => {
  if (!formatterStore.sql.trim()) return '格式化结果将在此处显示…';

  if (!isSqlMode.value) {
    if (!formatterStore.outputHtml) return '';
    if (jsonNodes.value.length === 0) return formatterStore.outputHtml;
    return buildJsonCodeHtml(jsonHtmlLines.value, jsonNodes.value, jsonCollapsed.value);
  }

  if (blocks.value.length === 0 && formatterStore.outputHtml) return formatterStore.outputHtml;
  if (blocks.value.length <= 1) return formatterStore.outputHtml || '';
  return buildCodeHtml(blocks.value, collapsed.value);
});

const isPlaceholder = computed(() => !formatterStore.sql.trim());
const errorMessage = computed(() => formatterStore.errorMessage);

// ── Toggle handlers ───────────────────────────────────────────────────────────

function toggleBlock(idx: number): void {
  const next = [...collapsed.value];
  next[idx] = !next[idx];
  collapsed.value = next;
}

function toggleJsonNode(startLine: number): void {
  const next = new Map(jsonCollapsed.value);
  next.set(startLine, !next.get(startLine));
  jsonCollapsed.value = next;
}

// ── Exposed API ───────────────────────────────────────────────────────────────

function foldAll(): void {
  if (isSqlMode.value) {
    if (blocks.value.length < 2) return;
    collapsed.value = blocks.value.map((b) => b.htmlLines.length - b.leadingCommentCount > 1);
  } else {
    const next = new Map<number, boolean>();
    for (const node of jsonNodes.value) next.set(node.startLine, true);
    jsonCollapsed.value = next;
  }
}

function unfoldAll(): void {
  if (isSqlMode.value) {
    if (blocks.value.length < 2) return;
    collapsed.value = blocks.value.map(() => false);
  } else {
    jsonCollapsed.value = new Map();
  }
}

function getPlainText(): string {
  if (isSqlMode.value) {
    if (blocks.value.length === 0) return unescapeHtml(formatterStore.outputHtml.replace(/<[^>]*>/g, '')) || '';
    return getPlainTextFromBlocks(blocks.value);
  }
  return unescapeHtml(formatterStore.outputHtml.replace(/<[^>]*>/g, ''));
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
