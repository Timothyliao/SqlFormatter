<template>
  <div class="app-root">
    <!-- Header -->
    <header class="app-header">
      <h1 class="app-title">SQL Formatter</h1>
      <div class="config-panel">
        <ConfigPanel />
      </div>
      <div class="theme-toggle-container">
        <ThemeToggle />
      </div>
    </header>

    <!-- Document tabs bar -->
    <div class="history-bar" aria-label="SQL 文档">
      <div class="history-panel-inner">
        <HistoryPanel ref="historyPanelRef" />
      </div>
    </div>

    <!-- Main layout: left input, right preview -->
    <main class="app-layout">
      <!-- Left: Input Panel -->
      <section
        class="panel panel-input"
        aria-label="SQL 输入"
        :style="{ flex: 'none', width: uiStore.leftPanelPct + '%' }"
      >
        <div class="panel-header">
          <span class="panel-label">输入 SQL</span>
          <div class="save-button-container">
            <SaveButton />
          </div>
        </div>
        <div class="panel-body">
          <InputPanel />
        </div>
      </section>

      <!-- Resizable divider -->
      <ResizableDivider />

      <!-- Right: Preview Panel -->
      <section class="panel panel-preview" aria-label="格式化预览" style="flex: 1">
        <div class="panel-header">
          <span class="panel-label">格式化结果</span>
          <span class="panel-shortcuts" aria-label="快捷键说明">
            <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>[</kbd> 折叠全部
            &nbsp;·&nbsp;
            <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>]</kbd> 展开全部
          </span>
          <div class="copy-button-container">
            <CopyButton :get-plain-text="getPreviewPlainText" />
          </div>
        </div>
        <div class="panel-body">
          <PreviewPanel ref="previewPanelRef" />
        </div>
      </section>
    </main>
  </div>

  <!-- Fun mode -->
  <EvolutionWidget />
  <EggBook />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useEventListener, watchDebounced } from '@vueuse/core';
import { useUiStore } from './stores/uiStore';
import { useHistoryStore } from './stores/historyStore';
import { useFormatterStore } from './stores/formatterStore';
import ConfigPanel from './components/ConfigPanel.vue';
import ThemeToggle from './components/ThemeToggle.vue';
import HistoryPanel from './components/HistoryPanel.vue';
import InputPanel from './components/InputPanel.vue';
import PreviewPanel from './components/PreviewPanel.vue';
import ResizableDivider from './components/ResizableDivider.vue';
import CopyButton from './components/CopyButton.vue';
import SaveButton from './components/SaveButton.vue';
import EvolutionWidget from './components/fun/EvolutionWidget.vue';
import EggBook from './components/fun/EggBook.vue';

const uiStore = useUiStore();
const historyStore = useHistoryStore();
const formatterStore = useFormatterStore();

const previewPanelRef = ref<InstanceType<typeof PreviewPanel>>();
const historyPanelRef = ref<InstanceType<typeof HistoryPanel>>();

function getPreviewPlainText(): string {
  return previewPanelRef.value?.getPlainText() ?? '';
}

// Load active document on startup
onMounted(() => {
  const doc = historyStore.getActiveDoc();
  if (doc && doc.sql) {
    formatterStore.isRestoringFromHistory = true;
    formatterStore.sql = doc.sql;
    setTimeout(() => {
      formatterStore.isRestoringFromHistory = false;
    }, 0);
  }
  formatterStore.runPipeline();
});

// Mark dirty on sql change (debounced pipeline fires, then we mark dirty)
watchDebounced(
  () => formatterStore.sql,
  () => {
    if (!formatterStore.isRestoringFromHistory && formatterStore.sql.trim()) {
      historyStore.markDirty();
    }
  },
  { debounce: 250 },
);

// Auto-save (1000ms debounce)
watchDebounced(
  () => formatterStore.sql,
  (val) => {
    if (!formatterStore.isRestoringFromHistory) {
      historyStore.saveActiveDoc(val);
    }
  },
  { debounce: 1000 },
);

// Global keyboard shortcuts
useEventListener(document, 'keydown', (e: KeyboardEvent) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    historyStore.saveActiveDoc(formatterStore.sql);
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === '[' || e.key === '{')) {
    e.preventDefault();
    previewPanelRef.value?.foldAll();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === ']' || e.key === '}')) {
    e.preventDefault();
    previewPanelRef.value?.unfoldAll();
  }
});
</script>
