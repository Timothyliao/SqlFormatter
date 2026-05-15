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
      <section class="panel panel-preview" aria-label="格式化预览" style="flex: 1; position: relative;">
        <div class="panel-header">
          <span class="panel-label">格式化结果</span>
          <div class="panel-header-actions">
            <div class="copy-button-container">
              <CopyButton :get-plain-text="getPreviewPlainText" />
            </div>
            <button
              class="shortcuts-trigger"
              :class="{ 'is-active': shortcutsOpen }"
              aria-label="查看快捷键"
              @click.stop="shortcutsOpen = !shortcutsOpen"
            >
              <!-- keyboard icon -->
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="2" y="6" width="20" height="13" rx="2" stroke="currentColor" stroke-width="1.6"/>
                <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h.01M18 14h.01M10 14h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="panel-body" @click="shortcutsOpen = false">
          <PreviewPanel ref="previewPanelRef" />
        </div>

        <!-- Shortcuts drawer -->
        <Transition name="shortcuts-drawer">
          <div
            v-if="shortcutsOpen"
            class="shortcuts-drawer"
            role="dialog"
            aria-label="快捷键列表"
            @click.stop
          >
            <div class="shortcuts-drawer-header">
              <span class="shortcuts-drawer-title">快捷键</span>
              <button
                class="shortcuts-drawer-close"
                aria-label="关闭"
                @click="shortcutsOpen = false"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
              </button>
            </div>
            <div class="shortcuts-drawer-body">
              <div class="shortcuts-drawer-section-title">折叠</div>
              <div class="shortcuts-drawer-row">
                <span class="shortcuts-drawer-desc">折叠全部</span>
                <span class="shortcuts-drawer-keys"><kbd>Ctrl</kbd><kbd>Shift</kbd><kbd>[</kbd></span>
              </div>
              <div class="shortcuts-drawer-row">
                <span class="shortcuts-drawer-desc">展开全部</span>
                <span class="shortcuts-drawer-keys"><kbd>Ctrl</kbd><kbd>Shift</kbd><kbd>]</kbd></span>
              </div>
              <div class="shortcuts-drawer-section-title">滚动</div>
              <div class="shortcuts-drawer-row">
                <span class="shortcuts-drawer-desc">滚动到首行</span>
                <span class="shortcuts-drawer-keys"><kbd>Ctrl</kbd><kbd>Home</kbd></span>
              </div>
              <div class="shortcuts-drawer-row">
                <span class="shortcuts-drawer-desc">滚动到末尾</span>
                <span class="shortcuts-drawer-keys"><kbd>Ctrl</kbd><kbd>End</kbd></span>
              </div>
            </div>
          </div>
        </Transition>
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
const shortcutsOpen = ref(false);

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
  if ((e.ctrlKey || e.metaKey) && e.key === 'Home') {
    e.preventDefault();
    previewPanelRef.value?.scrollToTop();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'End') {
    e.preventDefault();
    previewPanelRef.value?.scrollToBottom();
  }
});
</script>
