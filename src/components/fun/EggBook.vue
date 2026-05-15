<template>
  <Teleport to="body">
    <div
      class="eggbook-overlay"
      :class="{ 'eggbook-overlay--visible': isOpen }"
      @click="close"
    />
    <div
      class="eggbook-panel"
      :class="{ 'eggbook-panel--visible': isOpen }"
      role="dialog"
      aria-label="彩蛋图鉴"
    >
      <div class="eggbook-header">
        <span class="eggbook-title">✦ 彩蛋图鉴</span>
        <button class="eggbook-close" aria-label="关闭" @click="close">×</button>
      </div>
      <div class="eggbook-progress">
        <span class="eggbook-count">已发现 {{ foundCount }} / {{ total }}</span>
        <div class="eggbook-bar">
          <div class="eggbook-bar-fill" :style="{ width: pct + '%' }" />
        </div>
      </div>
      <ul class="eggbook-list">
        <li
          v-for="egg in EGG_DEFINITIONS"
          :key="egg.id"
          class="eggbook-item"
          :class="{ 'eggbook-item--found': discovered.has(egg.id) }"
        >
          <span class="eggbook-item-icon">{{ discovered.has(egg.id) ? '✅' : '❓' }}</span>
          <span class="eggbook-item-name">{{ discovered.has(egg.id) ? egg.name : '???' }}</span>
        </li>
      </ul>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { EGG_DEFINITIONS } from '../../fun/EasterEgg';

const STORAGE_KEY = 'sql-formatter-eggbook';

const isOpen = ref(false);
const discovered = ref<Set<string>>(new Set());

function loadDiscovered(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    discovered.value = new Set(raw ? JSON.parse(raw) : []);
  } catch {
    discovered.value = new Set();
  }
}

const total = EGG_DEFINITIONS.length;
const foundCount = computed(() => discovered.value.size);
const pct = computed(() => Math.round((foundCount.value / total) * 100));

function open(): void {
  loadDiscovered();
  isOpen.value = true;
}

function close(): void {
  isOpen.value = false;
}

function onOpenEggBook(): void {
  open();
}

function onEggDiscovered(): void {
  loadDiscovered();
}

function onKeyDown(e: KeyboardEvent): void {
  if (e.key === 'Escape' && isOpen.value) close();
}

onMounted(() => {
  loadDiscovered();
  document.addEventListener('open-egg-book', onOpenEggBook);
  document.addEventListener('egg-discovered', onEggDiscovered);
  document.addEventListener('keydown', onKeyDown);
});

onUnmounted(() => {
  document.removeEventListener('open-egg-book', onOpenEggBook);
  document.removeEventListener('egg-discovered', onEggDiscovered);
  document.removeEventListener('keydown', onKeyDown);
});
</script>
