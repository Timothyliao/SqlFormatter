<template>
  <!-- entry button (sits in right panel header) -->
  <button class="lg-fab" aria-label="周末去哪儿玩" @click="openGame">🎲 抽奖</button>

  <!-- Modal -->
  <Transition name="lg-fade">
    <div v-if="open" class="lg-mask" @click.self="close">
      <div class="lg-card" role="dialog" aria-label="周末去哪儿玩">
        <button class="lg-close" aria-label="关闭" @click="close">✕</button>
        <h3 class="lg-title">周末去哪儿玩</h3>

        <!-- explosion burst -->
        <div v-if="particles.length" :key="boomKey" class="lg-burst">
          <span class="lg-ring" />
          <span
            v-for="(p, i) in particles"
            :key="i"
            class="lg-particle"
            :style="{ '--tx': p.x + 'px', '--ty': p.y + 'px', width: p.s + 'px', height: p.s + 'px', background: p.c }"
          />
        </div>

        <ul class="lg-list">
          <li
            v-for="(opt, i) in displayOptions"
            :key="opt"
            class="lg-item"
            :class="{ 'is-active': i === activeIndex, 'is-win': !rolling && result === opt }"
          >
            {{ !rolling && result === opt ? opt : '🎁' }}
          </li>
        </ul>

        <p class="lg-result">{{ rolling ? '抽取中…' : result ? '✨ ' + result + ' ✨' : '点击开始，看看周末去哪！' }}</p>

        <button class="lg-go" :disabled="rolling" @click="start">
          {{ rolling ? '转动中…' : result ? '再抽一次' : '开始抽奖' }}
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const options = ['苏州', '海盐', '宝宝说一不二'];
const displayOptions = ref([...options]);
const open = ref(false);
const rolling = ref(false);
const activeIndex = ref(-1);
const result = ref<string | null>(null);
const particles = ref<{ x: number; y: number; c: string; s: number }[]>([]);
const boomKey = ref(0);
const palette = ['#f38ba8', '#a6e3a1', '#f9e2af', '#89b4fa', '#cba6f7', '#89dceb', '#fab387'];

function reset() {
  result.value = null;
  activeIndex.value = -1;
  particles.value = [];
}

function openGame() {
  reset();
  displayOptions.value = [...options].sort(() => Math.random() - 0.5);
  open.value = true;
}

function boom() {
  const N = 44;
  particles.value = Array.from({ length: N }, (_, i) => {
    const a = (i / N) * Math.PI * 2 + Math.random() * 0.4;
    const d = 110 + Math.random() * 140;
    return { x: Math.cos(a) * d, y: Math.sin(a) * d, c: palette[i % palette.length], s: 8 + Math.random() * 10 };
  });
  boomKey.value++;
}

function start() {
  if (rolling.value) return;
  result.value = null;
  particles.value = [];
  rolling.value = true;
  const n = displayOptions.value.length;
  const winner = Math.floor(Math.random() * n);
  const startIdx = ((activeIndex.value % n) + n) % n;
  const totalTicks = 8 * n + ((winner - startIdx + n) % n);
  let tick = 0;
  const tickFn = () => {
    activeIndex.value = (activeIndex.value + 1) % n;
    tick++;
    if (tick >= totalTicks) {
      rolling.value = false;
      result.value = displayOptions.value[activeIndex.value];
      boom();
      return;
    }
    const p = tick / totalTicks;
    setTimeout(tickFn, 60 + 340 * p * p);
  };
  setTimeout(tickFn, 60);
}

function close() {
  if (rolling.value) return;
  open.value = false;
  reset();
}
</script>

<style scoped>
.lg-fab {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: var(--border-radius, 6px);
  border: none;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  color: #fff;
  background: linear-gradient(135deg, #89b4fa, #cba6f7);
  box-shadow: 0 2px 8px rgba(137, 180, 250, 0.5);
  transition: filter 0.2s;
  animation: lg-glow 2s ease-in-out infinite, lg-wiggle 4s ease-in-out infinite;
}
.lg-fab:hover { filter: brightness(1.12); animation-play-state: paused; }
@keyframes lg-glow {
  0%, 100% { box-shadow: 0 2px 8px rgba(137, 180, 250, 0.5); }
  50% { box-shadow: 0 2px 18px rgba(203, 166, 247, 0.95); }
}
@keyframes lg-wiggle {
  0%, 84%, 100% { transform: scale(1) rotate(0); }
  88% { transform: scale(1.12) rotate(-9deg); }
  92% { transform: scale(1.12) rotate(9deg); }
  96% { transform: scale(1.12) rotate(-5deg); }
}

.lg-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}
.lg-card {
  position: relative;
  width: min(90vw, 340px);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  padding: 24px 20px 20px;
  text-align: center;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
}
.lg-close {
  position: absolute;
  top: 10px;
  right: 12px;
  border: none;
  background: none;
  color: var(--color-text-muted);
  font-size: 16px;
  cursor: pointer;
}
.lg-title {
  margin: 0 0 18px;
  font-size: 18px;
  color: var(--color-text);
}
.lg-list {
  list-style: none;
  margin: 0 0 16px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.lg-item {
  padding: 14px;
  border-radius: 10px;
  border: 2px solid var(--color-border);
  background: var(--color-surface-alt);
  color: var(--color-text);
  font-size: 16px;
  transition: transform 0.1s, border-color 0.1s;
}
.lg-item.is-active {
  border-color: var(--color-accent);
  background: var(--color-accent);
  color: #fff;
  transform: scale(1.05);
}
.lg-item.is-win {
  border-color: var(--color-accent);
  animation: lg-pop 0.5s ease;
}
@keyframes lg-pop {
  0% { transform: scale(1); }
  30% { transform: scale(1.25) rotate(-2deg); }
  55% { transform: scale(0.95) rotate(2deg); }
  100% { transform: scale(1.05); }
}

/* explosion burst */
.lg-burst {
  position: absolute;
  left: 50%;
  top: 45%;
  width: 0;
  height: 0;
  pointer-events: none;
  z-index: 5;
}
.lg-ring {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 20px;
  height: 20px;
  margin: -10px 0 0 -10px;
  border-radius: 50%;
  border: 4px solid var(--color-accent);
  animation: lg-shock 0.7s ease-out forwards;
}
@keyframes lg-shock {
  0% { transform: scale(0.2); opacity: 0.9; }
  100% { transform: scale(14); opacity: 0; border-width: 0; }
}
.lg-particle {
  position: absolute;
  border-radius: 50%;
  box-shadow: 0 0 8px currentColor;
  animation: lg-boom 1s cubic-bezier(0.12, 0.7, 0.3, 1) forwards;
}
@keyframes lg-boom {
  0% { transform: translate(0, 0) scale(1.4); opacity: 1; }
  70% { opacity: 1; }
  100% { transform: translate(var(--tx), var(--ty)) scale(0.1); opacity: 0; }
}
.lg-result {
  margin: 0 0 16px;
  min-height: 20px;
  font-size: 15px;
  color: var(--color-text);
}
.lg-go {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  cursor: pointer;
  color: #fff;
  background: linear-gradient(135deg, #89b4fa, #cba6f7);
}
.lg-go:disabled { opacity: 0.6; cursor: not-allowed; }

.lg-fade-enter-active,
.lg-fade-leave-active { transition: opacity 0.2s; }
.lg-fade-enter-from,
.lg-fade-leave-to { opacity: 0; }
</style>
