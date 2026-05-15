<template>
  <div
    ref="dividerEl"
    class="panel-divider panel-divider--resizable"
    role="separator"
    aria-label="拖拽调整面板宽度"
    tabindex="0"
    :class="{ 'panel-divider--dragging': isDragging }"
    @mousedown="onMouseDown"
    @touchstart.passive="onTouchStart"
    @keydown="onKeyDown"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useUiStore } from '../stores/uiStore';

const uiStore = useUiStore();
const dividerEl = ref<HTMLElement>();

const isDragging = ref(false);
let startX = 0;
let startLeftPct = 0;

// ── Mouse ─────────────────────────────────────────────────────────────────────

function onMouseDown(e: MouseEvent): void {
  if (window.innerWidth < 768) return;
  startDrag(e.clientX);
  e.preventDefault();
}

function onMouseMove(e: MouseEvent): void {
  if (!isDragging.value) return;
  updateSplit(e.clientX);
}

function onMouseUp(): void {
  endDrag();
}

// ── Touch ─────────────────────────────────────────────────────────────────────

function onTouchStart(e: TouchEvent): void {
  if (window.innerWidth < 768) return;
  const touch = e.touches[0];
  if (touch) startDrag(touch.clientX);
}

function onTouchMove(e: TouchEvent): void {
  if (!isDragging.value) return;
  e.preventDefault();
  const touch = e.touches[0];
  if (touch) updateSplit(touch.clientX);
}

function onTouchEnd(): void {
  endDrag();
}

// ── Keyboard ──────────────────────────────────────────────────────────────────

function onKeyDown(e: KeyboardEvent): void {
  if (window.innerWidth < 768) return;
  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    uiStore.leftPanelPct = Math.max(20, Math.min(80, uiStore.leftPanelPct - 2));
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    uiStore.leftPanelPct = Math.max(20, Math.min(80, uiStore.leftPanelPct + 2));
  }
}

// ── Drag helpers ──────────────────────────────────────────────────────────────

function startDrag(clientX: number): void {
  isDragging.value = true;
  startX = clientX;
  startLeftPct = uiStore.leftPanelPct;
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
}

function updateSplit(clientX: number): void {
  const layout = dividerEl.value?.parentElement;
  if (!layout) return;
  const containerWidth = layout.getBoundingClientRect().width;
  if (containerWidth === 0) return;
  const delta = clientX - startX;
  const deltaPct = (delta / containerWidth) * 100;
  uiStore.leftPanelPct = Math.max(20, Math.min(80, startLeftPct + deltaPct));
}

function endDrag(): void {
  if (!isDragging.value) return;
  isDragging.value = false;
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(() => {
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  document.addEventListener('touchmove', onTouchMove, { passive: false });
  document.addEventListener('touchend', onTouchEnd);
});

onUnmounted(() => {
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', onMouseUp);
  document.removeEventListener('touchmove', onTouchMove);
  document.removeEventListener('touchend', onTouchEnd);
});
</script>
