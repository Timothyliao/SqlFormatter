<template>
  <div
    ref="containerRef"
    class="evo-widget"
    :class="{
      'evo-widget--max': currentLevel === 7,
      'evo-widget--alert': isAlerting,
      'evo-widget--dormant': eraState === 'dormant',
      'evo-widget--chaotic': eraState === 'chaotic',
    }"
    :style="widgetStyle"
    aria-label="进化论"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <button class="evo-book-btn" aria-label="彩蛋图鉴" @click.stop="openEggBook">✦</button>
    <div ref="emojiEl" class="evo-emoji">{{ displayEmoji }}</div>
    <div class="evo-level">Lv.{{ currentLevel }}</div>

    <!-- Tooltip -->
    <div
      v-if="tooltipVisible && currentScore"
      class="evo-tooltip"
      :class="`evo-tooltip--${snapEdge} evo-tooltip--visible`"
    >
      <div class="evo-tt-title">{{ levelData.emoji }} {{ levelData.name }}</div>
      <div class="evo-tt-score">活跃度：{{ currentScore.total }}</div>
      <div class="evo-tt-bar">
        <div class="evo-tt-bar-fill" :style="{ width: tooltipPct + '%' }" />
      </div>
      <div class="evo-tt-next">{{ tooltipNextText }}</div>
      <div class="evo-tt-breakdown">
        <span>编辑 ×{{ currentScore.breakdown.edits }}</span>
        <span>专注 {{ currentScore.breakdown.focusMinutes }}min</span>
        <span>多样性 ×{{ currentScore.breakdown.diversity }}</span>
      </div>
    </div>

    <!-- Message bubble (terminal) -->
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
    <div v-if="toastVisible" class="evo-toast evo-toast--visible" :style="popupStyle">
      {{ toastText }}
    </div>

    <!-- Tagline -->
    <div v-if="taglineVisible" class="evo-tagline evo-tagline--visible" :style="popupStyle">
      {{ taglineText }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useFormatterStore } from '../../stores/formatterStore';
import { useThemeStore } from '../../stores/themeStore';
import { useHistoryStore } from '../../stores/historyStore';
import { FunMode } from '../../fun/FunMode';
import { calcScore, calcEra, getLevel, EVOLUTION_LEVELS } from '../../fun/ActivityScore';
import type { ActivityScore } from '../../fun/ActivityScore';
import { EasterEgg } from '../../fun/EasterEgg';
import type { IEvolutionWidget } from '../../fun/EasterEgg';
import { useEvoWidget } from '../../composables/useEvoWidget';

// ── Stores ────────────────────────────────────────────────────────────────────

const formatterStore = useFormatterStore();
const themeStore = useThemeStore();
const historyStore = useHistoryStore();

// ── Drag / snap ───────────────────────────────────────────────────────────────

const containerRef = ref<HTMLElement | null>(null);
const emojiEl = ref<HTMLElement | null>(null);
const { snapEdge, isDragging } = useEvoWidget(containerRef);

// ── Activity tracking ─────────────────────────────────────────────────────────

const editCount = ref(0);
const focusMinutes = ref(0);
const diversity = ref(0);  // 已计入的多样性种类
const diversityFlags = { theme: false, config: false, doc: false };

const recentLengths = ref<number[]>([]);  // 最近 5 次内容长度，用于计算纪元
const lastInputTime = ref(Date.now());
const eraState = ref<'dormant' | 'stable' | 'chaotic' | 'reviving'>('stable');

let focusTimer: ReturnType<typeof setInterval> | null = null;
let dormantTimer: ReturnType<typeof setTimeout> | null = null;
const DORMANT_MS = 2 * 60 * 1000;

function resetDormantTimer(): void {
  if (dormantTimer) clearTimeout(dormantTimer);
  if (eraState.value === 'dormant') {
    eraState.value = 'reviving';
    easterEgg.trigger('revive'); // 无彩蛋定义时静默忽略
    setTimeout(() => {
      eraState.value = calcEra(recentLengths.value) === 'chaotic' ? 'chaotic' : 'stable';
    }, 1500);
  }
  dormantTimer = setTimeout(() => {
    eraState.value = 'dormant';
  }, DORMANT_MS);
}

// ── Score & level ─────────────────────────────────────────────────────────────

const currentScore = ref<ActivityScore | null>(null);
const currentLevel = ref(1);

function updateScore(): void {
  const score = calcScore(editCount.value, focusMinutes.value, diversity.value, formatterStore.sql.length);
  currentScore.value = score;
  const level = getLevel(score);
  if (level.level > currentLevel.value) {
    enqueue({ type: 'tagline', text: `已进化为 ${level.name}！` });
  }
  currentLevel.value = level.level;
}

// ── Display emoji (dormant → 💤, else level emoji) ────────────────────────────

const displayEmoji = computed(() => {
  if (eraState.value === 'dormant') return '💤';
  return levelData.value.emoji;
});

// ── Message queue ─────────────────────────────────────────────────────────────

type QueueItem =
  | { type: 'terminal'; lines: Array<{ text: string; cls?: string }> }
  | { type: 'toast'; message: string; durationMs: number }
  | { type: 'tagline'; text: string }
  | { type: 'alert'; durationMs: number };

const queue: QueueItem[] = [];
let queueBusy = false;

const bubbleVisible = ref(false);
const bubbleLines = ref<Array<{ text: string; cls?: string }>>([]);
const toastVisible = ref(false);
const toastText = ref('');
const taglineVisible = ref(false);
const taglineText = ref('');
const isAlerting = ref(false);
const tooltipVisible = ref(false);

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
    case 'alert':    playAlert(item.durationMs); break;
  }
}

function doneAndNext(): void { setTimeout(() => processNext(), 500); }

function playTerminal(lines: Array<{ text: string; cls?: string }>): void {
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

function playAlert(durationMs: number): void {
  const prevEmoji = emojiEl.value?.textContent ?? '';
  if (emojiEl.value) emojiEl.value.textContent = '🚨';
  isAlerting.value = true;
  setTimeout(() => {
    isAlerting.value = false;
    if (emojiEl.value) emojiEl.value.textContent = prevEmoji;
    doneAndNext();
  }, durationMs);
}

function confetti(): void {
  const el = document.createElement('div');
  el.className = 'egg-confetti';
  for (let i = 0; i < 40; i++) {
    const p = document.createElement('div');
    p.className = 'egg-confetti-piece';
    p.style.setProperty('--x', `${Math.random() * 100}vw`);
    p.style.setProperty('--delay', `${Math.random() * 0.6}s`);
    p.style.setProperty('--color', `hsl(${Math.random() * 360},80%,60%)`);
    el.appendChild(p);
  }
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// ── Widget API for EasterEgg ──────────────────────────────────────────────────

const widgetApi: IEvolutionWidget = {
  showToast: (message, durationMs = 2500) => {
    if (!FunMode.isEnabled()) return;
    enqueue({ type: 'toast', message, durationMs });
  },
  showTerminal: (lines) => {
    if (!FunMode.isEnabled()) return;
    enqueue({ type: 'terminal', lines });
  },
  showAlert: (durationMs = 3000) => {
    if (!FunMode.isEnabled()) return;
    enqueue({ type: 'alert', durationMs });
  },
  showTagline: (text) => {
    if (!FunMode.isEnabled()) return;
    enqueue({ type: 'tagline', text });
  },
  showConfetti: () => {
    if (!FunMode.isEnabled()) return;
    confetti();
  },
};

const easterEgg = new EasterEgg(widgetApi);

// ── Popup positioning ─────────────────────────────────────────────────────────

const SIDE_GAP = 56 + 14;
const popupStyle = computed(() => {
  const style: Record<string, string> = { position: 'absolute' };
  switch (snapEdge.value) {
    case 'right':  style['right']  = `${SIDE_GAP}px`; style['top']    = '-8px'; break;
    case 'left':   style['left']   = `${SIDE_GAP}px`; style['top']    = '-8px'; break;
    case 'bottom': style['bottom'] = `${SIDE_GAP}px`; style['right']  = '0';    break;
    case 'top':    style['top']    = `${SIDE_GAP}px`; style['right']  = '0';    break;
  }
  return style;
});

// ── Level / tooltip ───────────────────────────────────────────────────────────

const levelData = computed(() => getLevel(currentScore.value ?? { total: 0, breakdown: { edits: 0, focusMinutes: 0, diversity: 0, contentTier: 0 } }));

const widgetStyle = computed(() => ({
  display: FunMode.isEnabled() ? '' : 'none',
  '--evo-border': levelData.value.borderColor,
  '--evo-glow': levelData.value.glowColor,
}));

const tooltipPct = computed(() => {
  if (!currentScore.value) return 0;
  const level = levelData.value;
  const next = EVOLUTION_LEVELS.find(l => l.level === level.level + 1);
  if (!next) return 100;
  return Math.round(((currentScore.value.total - level.minScore) / (next.minScore - level.minScore)) * 100);
});

const tooltipNextText = computed(() => {
  if (!currentScore.value) return '';
  const level = levelData.value;
  const next = EVOLUTION_LEVELS.find(l => l.level === level.level + 1);
  if (!next) return '已达最高进化';
  return `距下一级还差 ${next.minScore - currentScore.value.total} 分`;
});

function onMouseEnter(): void {
  if (!isDragging.value) tooltipVisible.value = true;
}
function onMouseLeave(): void {
  tooltipVisible.value = false;
}

// ── Watchers ──────────────────────────────────────────────────────────────────

// 内容变化 → 编辑计数 + 纪元计算 + 彩蛋检测
watch(() => formatterStore.sql, (sql, prev) => {
  if (!FunMode.isEnabled()) return;
  resetDormantTimer();
  lastInputTime.value = Date.now();

  // 清空检测
  if (!sql.trim() && prev?.trim()) {
    easterEgg.trigger('reset');
  }

  editCount.value++;

  // 记录最近 5 次长度
  recentLengths.value = [...recentLengths.value.slice(-4), sql.length];
  const era = calcEra(recentLengths.value);
  if (eraState.value !== 'dormant' && eraState.value !== 'reviving') {
    eraState.value = era;
  }

  updateScore();
});

// 主题切换多样性
watch(() => themeStore.theme, () => {
  if (!diversityFlags.theme) {
    diversityFlags.theme = true;
    diversity.value++;
    updateScore();
  }
  // 切换 3 次触发彩蛋（用独立计数）
});

// 文档切换多样性 + multiverse 彩蛋
watch(() => historyStore.docs.length, (len) => {
  if (!diversityFlags.doc) {
    diversityFlags.doc = true;
    diversity.value++;
    updateScore();
  }
  if (len >= 5) easterEgg.trigger('multiverse');
});

// 配置变化多样性
watch(() => formatterStore.config, () => {
  if (!diversityFlags.config) {
    diversityFlags.config = true;
    diversity.value++;
    updateScore();
  }
}, { deep: true });

// ── 主题切换次数计数（light-seeker）────────────────────────────────────────────

let themeToggleCount = 0;
watch(() => themeStore.theme, () => {
  themeToggleCount++;
  if (themeToggleCount === 3) easterEgg.trigger('light-seeker');
});

// ── 键盘事件：撤销/重做计数（time-traveler）──────────────────────────────────

let undoRedoCount = 0;
function onKeyDown(e: KeyboardEvent): void {
  if (!FunMode.isEnabled()) return;
  const isUndo = (e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z';
  const isRedo = (e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'));
  if (isUndo || isRedo) {
    undoRedoCount++;
    if (undoRedoCount === 5) easterEgg.trigger('time-traveler');
  }
}

// ── 专注时长计时 ──────────────────────────────────────────────────────────────

let totalFocusMinutes = 0;
function startFocusTimer(): void {
  focusTimer = setInterval(() => {
    if (eraState.value === 'dormant') return;
    totalFocusMinutes++;
    focusMinutes.value = totalFocusMinutes;
    updateScore();
    if (totalFocusMinutes === 30) easterEgg.trigger('deep-focus');
    if (totalFocusMinutes === 60) easterEgg.trigger('marathon');
  }, 60 * 1000);
}

// ── EggBook ───────────────────────────────────────────────────────────────────

function openEggBook(): void {
  document.dispatchEvent(new CustomEvent('open-egg-book'));
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(() => {
  updateScore();
  resetDormantTimer();
  startFocusTimer();
  document.addEventListener('keydown', onKeyDown);

  // 首次访问彩蛋
  if (easterEgg.isFirstVisit() && !formatterStore.sql.trim()) {
    setTimeout(() => easterEgg.trigger('first-contact'), 1500);
  }

  // 空白停留 1 分钟 → void 彩蛋
  setInterval(() => {
    if (!formatterStore.sql.trim() && Date.now() - lastInputTime.value > 60 * 1000) {
      easterEgg.trigger('void');
    }
  }, 60 * 1000);
});

onUnmounted(() => {
  if (focusTimer) clearInterval(focusTimer);
  if (dormantTimer) clearTimeout(dormantTimer);
  document.removeEventListener('keydown', onKeyDown);
});
</script>
