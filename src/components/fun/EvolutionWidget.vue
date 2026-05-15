<template>
  <div
    ref="containerRef"
    class="evo-widget"
    :class="{ 'evo-widget--max': currentLevel === 7 }"
    :style="widgetStyle"
    aria-label="SQL 进化论"
    @mouseenter="showTooltip"
    @mouseleave="hideTooltip"
  >
    <button class="evo-book-btn" aria-label="彩蛋图鉴" @click.stop="openEggBook">✦</button>
    <div ref="emojiEl" class="evo-emoji">{{ levelData.emoji }}</div>
    <div class="evo-level">Lv.{{ currentLevel }}</div>

    <!-- Tooltip -->
    <div
      v-if="tooltipVisible && currentScore"
      class="evo-tooltip"
      :class="`evo-tooltip--${snapEdge} evo-tooltip--visible`"
    >
      <div class="evo-tt-title">{{ levelData.emoji }} {{ levelData.name }}</div>
      <div class="evo-tt-score">复杂度评分：{{ currentScore.total }}</div>
      <div class="evo-tt-bar">
        <div class="evo-tt-bar-fill" :style="{ width: tooltipPct + '%' }" />
      </div>
      <div class="evo-tt-next">{{ tooltipNextText }}</div>
      <div class="evo-tt-breakdown">
        <template v-if="currentScore.breakdown.joins > 0">JOIN ×{{ currentScore.breakdown.joins }} </template>
        <template v-if="currentScore.breakdown.ctes > 0">CTE ×{{ currentScore.breakdown.ctes }} </template>
        <template v-if="currentScore.breakdown.subqueries > 0">子查询 ×{{ currentScore.breakdown.subqueries }} </template>
        <template v-if="currentScore.breakdown.windowFns > 0">窗口函数 ×{{ currentScore.breakdown.windowFns }}</template>
      </div>
    </div>

    <!-- Message bubble (terminal / toast / tagline) -->
    <div
      v-if="bubbleVisible"
      class="evo-bubble"
      :class="`evo-bubble--${snapEdge} evo-bubble--visible`"
    >
      <div class="evo-bubble-lines">
        <div
          v-for="(line, i) in bubbleLines"
          :key="i"
          class="evo-bubble-row"
          :class="line.cls"
        >{{ line.text }}</div>
      </div>
    </div>

    <!-- Toast -->
    <div
      v-if="toastVisible"
      class="evo-toast evo-toast--visible"
      :style="popupStyle"
    >{{ toastText }}</div>

    <!-- Tagline -->
    <div
      v-if="taglineVisible"
      class="evo-tagline evo-tagline--visible"
      :style="popupStyle"
    >{{ taglineText }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useFormatterStore } from '../../stores/formatterStore';
import { FunMode } from '../../fun/FunMode';
import { scoreSql, getLevel, EVOLUTION_LEVELS } from '../../fun/SqlComplexity';
import { EasterEgg } from '../../fun/EasterEgg';
import type { IEvolutionWidget } from '../../fun/EasterEgg';
import { useEvoWidget } from '../../composables/useEvoWidget';
import type { ComplexityScore } from '../../fun/SqlComplexity';

const formatterStore = useFormatterStore();

const containerRef = ref<HTMLElement | null>(null);
const emojiEl = ref<HTMLElement | null>(null);

const { snapEdge, isDragging } = useEvoWidget(containerRef);

const currentLevel = ref(1);
const currentScore = ref<ComplexityScore | null>(null);
const tooltipVisible = ref(false);

// ── Message queue ─────────────────────────────────────────────────────────────

type QueueItem =
  | { type: 'terminal'; lines: Array<{ text: string; cls?: string }> }
  | { type: 'toast'; message: string; durationMs: number }
  | { type: 'tagline'; text: string };

const queue: QueueItem[] = [];
let queueBusy = false;

const bubbleVisible = ref(false);
const bubbleLines = ref<Array<{ text: string; cls?: string }>>([]);
const toastVisible = ref(false);
const toastText = ref('');
const taglineVisible = ref(false);
const taglineText = ref('');

function enqueue(item: QueueItem): void {
  queue.push(item);
  if (!queueBusy) processNext();
}

function processNext(): void {
  if (queue.length === 0) { queueBusy = false; return; }
  queueBusy = true;
  const item = queue.shift()!;
  switch (item.type) {
    case 'terminal': playTerminal(item.lines); break;
    case 'toast':    playToast(item.message, item.durationMs); break;
    case 'tagline':  playTagline(item.text); break;
  }
}

function doneAndNext(): void {
  setTimeout(() => processNext(), 500);
}

function playTerminal(lines: Array<{ text: string; cls?: string }>): void {
  // Animate typing line by line
  const result: Array<{ text: string; cls?: string }> = [];
  bubbleLines.value = [];
  bubbleVisible.value = true;

  let cumulativeDelay = 120;
  lines.forEach(({ text, cls }, idx) => {
    const rowDelay = cumulativeDelay;
    const typeDuration = Math.min(900, Math.max(300, text.length * 28));
    cumulativeDelay += typeDuration + 100;

    setTimeout(() => {
      result.push({ text: '', cls });
      bubbleLines.value = [...result];

      let i = 0;
      const speed = Math.floor(typeDuration / text.length) || 28;
      const timer = setInterval(() => {
        result[idx]!.text = text.slice(0, i + 1);
        bubbleLines.value = [...result];
        i++;
        if (i >= text.length) clearInterval(timer);
      }, speed);
    }, rowDelay);
  });

  const totalDuration = cumulativeDelay + 1500;
  setTimeout(() => {
    bubbleVisible.value = false;
    setTimeout(() => { bubbleLines.value = []; doneAndNext(); }, 400);
  }, totalDuration);
}

function playToast(message: string, durationMs: number): void {
  toastText.value = message;
  toastVisible.value = true;
  setTimeout(() => {
    toastVisible.value = false;
    setTimeout(() => doneAndNext(), 400);
  }, durationMs);
}

function playTagline(text: string): void {
  taglineText.value = text;
  taglineVisible.value = true;
  setTimeout(() => {
    taglineVisible.value = false;
    setTimeout(() => doneAndNext(), 500);
  }, 2200);
}

// ── Popup positioning ─────────────────────────────────────────────────────────

const SIDE_GAP = 56 + 14;

const popupStyle = computed(() => {
  const style: Record<string, string> = { position: 'absolute' };
  switch (snapEdge.value) {
    case 'right':
      style['right'] = `${SIDE_GAP}px`;
      style['top'] = '-8px';
      break;
    case 'left':
      style['left'] = `${SIDE_GAP}px`;
      style['top'] = '-8px';
      break;
    case 'bottom':
      style['bottom'] = `${SIDE_GAP}px`;
      style['right'] = '0';
      break;
    case 'top':
      style['top'] = `${SIDE_GAP}px`;
      style['right'] = '0';
      break;
  }
  return style;
});

// ── Widget style ──────────────────────────────────────────────────────────────

const levelData = computed(() => {
  const score = currentScore.value ?? { total: 0, breakdown: { lines: 0, joins: 0, subqueries: 0, ctes: 0, windowFns: 0, unions: 0 } };
  return getLevel(score);
});

const widgetStyle = computed(() => ({
  display: FunMode.isEnabled() ? '' : 'none',
  '--evo-border': levelData.value.borderColor,
  '--evo-glow': levelData.value.glowColor,
}));

// ── Tooltip ───────────────────────────────────────────────────────────────────

const tooltipPct = computed(() => {
  if (!currentScore.value) return 0;
  const level = levelData.value;
  const next = EVOLUTION_LEVELS.find((l) => l.level === level.level + 1);
  if (!next) return 100;
  return Math.round(((currentScore.value.total - level.minScore) / (next.minScore - level.minScore)) * 100);
});

const tooltipNextText = computed(() => {
  if (!currentScore.value) return '';
  const level = levelData.value;
  const next = EVOLUTION_LEVELS.find((l) => l.level === level.level + 1);
  if (!next) return '已达最高进化';
  return `距下一级还差 ${next.minScore - currentScore.value.total} 分`;
});

function showTooltip(): void {
  if (!currentScore.value || isDragging.value) return;
  tooltipVisible.value = true;
}

function hideTooltip(): void {
  tooltipVisible.value = false;
}

// ── Easter egg integration ────────────────────────────────────────────────────

// Expose widget API for EasterEgg
const widgetApi: IEvolutionWidget = {
  showToast: (message: string, durationMs = 2500) => {
    if (!FunMode.isEnabled()) return;
    enqueue({ type: 'toast', message, durationMs });
  },
  showTerminal: (lines: Array<{ text: string; cls?: string }>) => {
    if (!FunMode.isEnabled()) return;
    if (emojiEl.value) {
      emojiEl.value.classList.add('evo-alert');
      emojiEl.value.addEventListener('animationend', () => {
        emojiEl.value?.classList.remove('evo-alert');
      }, { once: true });
    }
    enqueue({ type: 'terminal', lines });
  },
};

const easterEgg = new EasterEgg(widgetApi);

// ── SQL watcher ───────────────────────────────────────────────────────────────

watch(
  () => formatterStore.sql,
  (sql) => {
    if (!FunMode.isEnabled()) return;

    const score = scoreSql(sql);
    const level = getLevel(score);
    currentScore.value = score;

    if (level.level !== currentLevel.value) {
      const isUpgrade = level.level > currentLevel.value;
      currentLevel.value = level.level;
      if (isUpgrade) {
        enqueue({ type: 'tagline', text: `已进化为 ${level.name}！` });
      }
    }

    easterEgg.check(sql);
  },
);

// ── EggBook button ────────────────────────────────────────────────────────────

function openEggBook(): void {
  document.dispatchEvent(new CustomEvent('open-egg-book'));
}

onMounted(() => {
  // Initialize with current sql
  if (formatterStore.sql) {
    const score = scoreSql(formatterStore.sql);
    currentScore.value = score;
    currentLevel.value = getLevel(score).level;
  }
});
</script>
