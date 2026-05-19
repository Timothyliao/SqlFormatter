<template>
  <div class="app-root">
    <!-- Header -->
    <header class="app-header">
      <div class="app-brand">
        <img src="/assets/logo.png" alt="Lumino" class="app-logo" />
      </div>
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
        :aria-label="inputPanelLabel"
        :style="{ flex: 'none', width: uiStore.leftPanelPct + '%' }"
      >
        <div class="panel-header">
          <span class="panel-label">{{ inputPanelLabel }}</span>
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
              <CopyButton ref="copyButtonRef" :get-plain-text="getPreviewPlainText" />
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
              <div
                v-for="shortcut in shortcuts"
                :key="shortcut.desc"
                class="shortcuts-drawer-row"
              >
                <span class="shortcuts-drawer-desc">{{ shortcut.desc }}</span>
                <span class="shortcuts-drawer-keys">
                  <kbd v-for="key in shortcut.keys" :key="key">{{ key }}</kbd>
                </span>
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
import { ref, computed, onMounted } from 'vue';
import { useEventListener, watchDebounced } from '@vueuse/core';
import { useUiStore } from './stores/uiStore';
import { useHistoryStore } from './stores/historyStore';
import { useFormatterStore } from './stores/formatterStore';
import { SHORTCUTS } from './config/shortcuts';
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

// Detect macOS for platform-aware shortcut display
const isMac = navigator.platform.toUpperCase().includes('MAC') || navigator.userAgent.includes('Mac');

// Resolve shortcut key labels for the current platform
const shortcuts = SHORTCUTS.map((s) => ({ desc: s.desc, keys: isMac ? s.mac : s.win }));

const uiStore = useUiStore();
const historyStore = useHistoryStore();
const formatterStore = useFormatterStore();

const previewPanelRef = ref<InstanceType<typeof PreviewPanel>>();
const historyPanelRef = ref<InstanceType<typeof HistoryPanel>>();
const copyButtonRef = ref<InstanceType<typeof CopyButton>>();
const shortcutsOpen = ref(false);

const inputPanelLabel = computed(() => {
  if (formatterStore.mode === 'json') return '粘贴内容';
  if (formatterStore.mode === 'stacktrace') return '粘贴 StackTrace';
  return '输入 SQL';
});

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
  // Ctrl/Cmd+C: copy formatted output when no text is selected and focus is not inside the editor
  if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
    const selection = window.getSelection()?.toString() ?? '';
    const activeEl = document.activeElement;
    const inEditor = activeEl?.closest('.cm-editor') !== null;
    if (!selection && !inEditor) {
      e.preventDefault();
      copyButtonRef.value?.copy();
      return;
    }
  }
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === '[' || e.key === '{')) {
    e.preventDefault();
    previewPanelRef.value?.foldAll();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === ']' || e.key === '}')) {
    e.preventDefault();
    previewPanelRef.value?.unfoldAll();
    return;
  }
  // Ctrl+Home / Cmd+Home: scroll to top
  // macOS alias: Cmd+ArrowUp (Home key is uncommon on Mac keyboards)
  if ((e.ctrlKey || e.metaKey) && (e.key === 'Home' || (e.metaKey && e.key === 'ArrowUp'))) {
    e.preventDefault();
    previewPanelRef.value?.scrollToTop();
    return;
  }
  // Ctrl+End / Cmd+End: scroll to bottom
  // macOS alias: Cmd+ArrowDown
  if ((e.ctrlKey || e.metaKey) && (e.key === 'End' || (e.metaKey && e.key === 'ArrowDown'))) {
    e.preventDefault();
    previewPanelRef.value?.scrollToBottom();
  }
});
</script>
