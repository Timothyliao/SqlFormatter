<template>
  <div
    ref="dividerEl"
    class="panel-divider panel-divider--resizable"
    :class="{
      'panel-divider--dragging': isDragging,
      'panel-divider--vertical': isVertical,
    }"
    role="separator"
    :aria-label="isVertical ? '拖拽调整面板高度' : '拖拽调整面板宽度'"
    tabindex="0"
    @mousedown="onMouseDown"
    @touchstart.passive="onTouchStart"
    @keydown="onKeyDown"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useUiStore } from '../stores/uiStore';

const uiStore = useUiStore();
const dividerEl = ref<HTMLElement>();

const isVertical = computed(() => uiStore.layoutDirection === 'vertical');

const isDragging = ref(false);
let startPos = 0;
let startLeftPct = 0;

// ── Mouse ─────────────────────────────────────────────────────────────────────

function onMouseDown(e: MouseEvent): void {
  if (window.innerWidth < 768) return;
  startDrag(isVertical.value ? e.clientY : e.clientX);
  e.preventDefault();
}

function onMouseMove(e: MouseEvent): void {
  if (!isDragging.value) return;
  updateSplit(isVertical.value ? e.clientY : e.clientX);
}

function onMouseUp(): void {
  endDrag();
}

// ── Touch ─────────────────────────────────────────────────────────────────────

function onTouchStart(e: TouchEvent): void {
  if (window.innerWidth < 768) return;
  const touch = e.touches[0];
  if (touch) startDrag(isVertical.value ? touch.clientY : touch.clientX);
}

function onTouchMove(e: TouchEvent): void {
  if (!isDragging.value) return;
  e.preventDefault();
  const touch = e.touches[0];
  if (touch) updateSplit(isVertical.value ? touch.clientY : touch.clientX);
}

function onTouchEnd(): void {
  endDrag();
}

// ── Keyboard ──────────────────────────────────────────────────────────────────

function onKeyDown(e: KeyboardEvent): void {
  if (window.innerWidth < 768) return;
  const shrinkKey = isVertical.value ? 'ArrowUp' : 'ArrowLeft';
  const growKey = isVertical.value ? 'ArrowDown' : 'ArrowRight';
  if (e.key === shrinkKey) {
    e.preventDefault();
    uiStore.leftPanelPct = Math.max(20, Math.min(80, uiStore.leftPanelPct - 2));
  } else if (e.key === growKey) {
    e.preventDefault();
    uiStore.leftPanelPct = Math.max(20, Math.min(80, uiStore.leftPanelPct + 2));
  }
}

// ── Drag helpers ──────────────────────────────────────────────────────────────

function startDrag(clientPos: number): void {
  isDragging.value = true;
  startPos = clientPos;
  startLeftPct = uiStore.leftPanelPct;
  document.body.style.cursor = isVertical.value ? 'row-resize' : 'col-resize';
  document.body.style.userSelect = 'none';
}

function updateSplit(clientPos: number): void {
  const layout = dividerEl.value?.parentElement;
  if (!layout) return;
  const containerSize = isVertical.value
    ? layout.getBoundingClientRect().height
    : layout.getBoundingClientRect().width;
  if (containerSize === 0) return;
  const delta = clientPos - startPos;
  const deltaPct = (delta / containerSize) * 100;
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
