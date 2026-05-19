<template>
  <!-- Format target selector (always visible in header) -->
  <div class="config-panel-inner">
    <div class="config-group">
      <label class="config-label">格式</label>
      <select
        class="config-select"
        aria-label="格式化目标"
        :value="formatterStore.formatTarget"
        @change="onFormatTargetChange"
      >
        <optgroup label="SQL">
          <option value="sql-postgresql">SQL · PostgreSQL</option>
          <option value="sql-mysql">SQL · MySQL</option>
          <option value="sql-sqlite">SQL · SQLite</option>
        </optgroup>
        <optgroup label="其他">
          <option value="json">JSON</option>
        </optgroup>
      </select>
    </div>

    <!-- Settings button -->
    <button
      class="settings-btn"
      :class="{ 'is-active': isOpen }"
      aria-label="打开格式化设置"
      title="格式化设置"
      @click="openModal"
    >
      <svg class="settings-btn-icon" width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
      <span class="settings-btn-label">设置</span>
    </button>
  </div>

  <!-- Modal overlay -->
  <Teleport to="body">
    <div
      class="settings-overlay"
      :class="{ 'is-open': isOpen }"
      aria-hidden="true"
      @click="closeModal"
    />
    <div
      class="settings-modal"
      :class="{ 'is-open': isOpen }"
      :style="{ display: modalDisplay }"
      role="dialog"
      aria-modal="true"
      aria-label="格式化设置"
    >
      <!-- Modal header -->
      <div class="settings-modal-header">
        <h2 class="settings-modal-title">格式化设置</h2>
        <button class="settings-modal-close" aria-label="关闭设置" @click="closeModal">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <!-- Modal body -->
      <div class="settings-modal-body">
        <!-- 格式化 section -->
        <div class="settings-section">
          <h3 class="settings-section-title">格式化</h3>

          <div class="settings-row">
            <label class="settings-row-label">缩进宽度</label>
            <select class="config-select" aria-label="缩进宽度" v-model.number="pending.indentWidth">
              <option :value="2">2 空格</option>
              <option :value="4">4 空格</option>
            </select>
          </div>

          <!-- SQL-only options -->
          <template v-if="formatterStore.mode === 'sql'">
            <div class="settings-row">
              <label class="settings-row-label">关键字大小写</label>
              <select class="config-select" aria-label="关键字大小写" v-model="pending.keywordCase">
                <option value="upper">大写 (UPPER)</option>
                <option value="lower">小写 (lower)</option>
                <option value="preserve">保留原样</option>
              </select>
            </div>

            <div class="settings-row">
              <label class="settings-row-label">逗号位置</label>
              <select class="config-select" aria-label="逗号位置" v-model="pending.commaPosition">
                <option value="after">行尾（a,）</option>
                <option value="before">行首（,a）</option>
              </select>
            </div>

            <div class="settings-row">
              <label class="settings-row-label">语句间空行</label>
              <select class="config-select" aria-label="多语句间空行数" v-model.number="pending.linesBetweenQueries">
                <option :value="1">1 行</option>
                <option :value="2">2 行</option>
              </select>
            </div>

            <div class="settings-row">
              <label class="settings-row-label">IN 每行值数</label>
              <input
                type="number" class="config-number" min="1" max="100"
                aria-label="IN 子句每行值数量"
                v-model.number="pending.valuesPerLine"
              />
            </div>
          </template>
        </div>

        <!-- 显示 section -->
        <div class="settings-section">
          <h3 class="settings-section-title">显示</h3>
          <div class="settings-row">
            <label class="settings-row-label">字体大小 (px)</label>
            <input
              type="number" class="config-number" min="10" max="24"
              aria-label="编辑器与预览字体大小（px）"
              v-model.number="pendingFontSize"
            />
          </div>
        </div>
      </div>

      <!-- Modal footer -->
      <div class="settings-modal-footer">
        <button class="settings-save-btn" title="应用格式化配置" @click="applyAndClose">
          应用
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue';
import { useEventListener } from '@vueuse/core';
import { useFormatterStore } from '../stores/formatterStore';
import { useUiStore } from '../stores/uiStore';
import { DEFAULT_CONFIG, DEFAULT_FONT_SIZE } from '../types/index';
import type { FormatterConfig, FormatTarget } from '../types/index';

const STORAGE_KEY = 'sql-formatter-config';

const formatterStore = useFormatterStore();
const uiStore = useUiStore();

const isOpen = ref(false);
const modalDisplay = ref('');

// Pending config (local copy, only applied on "应用")
const pending = reactive<FormatterConfig>({ ...DEFAULT_CONFIG });
const pendingFontSize = ref(DEFAULT_FONT_SIZE);

// Load persisted config on mount
onMounted(() => {
  loadFromStorage();
});

function loadFromStorage(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw) as { config?: Partial<FormatterConfig>; fontSize?: number; formatTarget?: FormatTarget };
    if (data.config) {
      const c = data.config;
      if (c.dialect && ['postgresql', 'mysql', 'sqlite'].includes(c.dialect)) {
        formatterStore.config = { ...formatterStore.config, dialect: c.dialect };
        pending.dialect = c.dialect;
      }
      if (c.indentWidth && [2, 4].includes(c.indentWidth)) {
        pending.indentWidth = c.indentWidth as 2 | 4;
      }
      if (c.keywordCase && ['upper', 'lower', 'preserve'].includes(c.keywordCase as string)) {
        pending.keywordCase = c.keywordCase;
      }
      if (c.commaPosition && ['before', 'after'].includes(c.commaPosition as string)) {
        pending.commaPosition = c.commaPosition;
      }
      if (c.linesBetweenQueries && [1, 2].includes(c.linesBetweenQueries)) {
        pending.linesBetweenQueries = c.linesBetweenQueries as 1 | 2;
      }
      if (typeof c.valuesPerLine === 'number' && c.valuesPerLine >= 1 && c.valuesPerLine <= 100) {
        pending.valuesPerLine = c.valuesPerLine;
      }
      formatterStore.config = { ...pending };
    }
    if (data.formatTarget) {
      formatterStore.setFormatTarget(data.formatTarget);
    }
    if (typeof data.fontSize === 'number' && data.fontSize >= 10 && data.fontSize <= 24) {
      pendingFontSize.value = data.fontSize;
      uiStore.fontSize = data.fontSize;
    }
  } catch { /* ignore */ }
}

function saveToStorage(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      config: { ...formatterStore.config },
      formatTarget: formatterStore.formatTarget,
      fontSize: uiStore.fontSize,
    }));
  } catch { /* ignore */ }
}

function onFormatTargetChange(e: Event): void {
  const val = (e.target as HTMLSelectElement).value as FormatTarget;
  formatterStore.setFormatTarget(val);
  saveToStorage();
}

function openModal(): void {
  Object.assign(pending, formatterStore.config);
  pendingFontSize.value = uiStore.fontSize;
  modalDisplay.value = 'flex';
  requestAnimationFrame(() => {
    isOpen.value = true;
  });
}

function closeModal(): void {
  isOpen.value = false;
  setTimeout(() => {
    if (!isOpen.value) modalDisplay.value = '';
  }, 300);
}

function applyAndClose(): void {
  const safeValues = Math.max(1, Math.min(100, pending.valuesPerLine || DEFAULT_CONFIG.valuesPerLine));
  formatterStore.config = {
    dialect: pending.dialect,
    indentWidth: pending.indentWidth,
    keywordCase: pending.keywordCase,
    commaPosition: pending.commaPosition,
    linesBetweenQueries: pending.linesBetweenQueries,
    valuesPerLine: safeValues,
  };
  const safeFontSize = Math.max(10, Math.min(24, pendingFontSize.value || DEFAULT_FONT_SIZE));
  uiStore.fontSize = safeFontSize;
  saveToStorage();
  closeModal();
}

// Close on Escape
useEventListener(document, 'keydown', (e: KeyboardEvent) => {
  if (e.key === 'Escape' && isOpen.value) closeModal();
});

// Keep pending.dialect in sync when formatTarget changes externally
watch(() => formatterStore.config.dialect, (d) => {
  pending.dialect = d;
});
</script>
