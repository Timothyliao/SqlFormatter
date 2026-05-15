<template>
  <button
    class="copy-btn"
    :class="feedbackClass"
    :disabled="isDisabled"
    aria-label="复制格式化后的 SQL"
    type="button"
    @click="handleClick"
  >
    {{ label }}
  </button>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  getPlainText: () => string;
}>();

const PLACEHOLDER = '格式化结果将在此处显示…';

const label = ref('复制');
const feedbackClass = ref('');
const isDisabled = ref(false);
let feedbackTimer: ReturnType<typeof setTimeout> | null = null;

async function handleClick(): Promise<void> {
  const text = props.getPlainText();
  if (!text || text === PLACEHOLDER) return;

  // Clipboard API requires secure context (HTTPS / localhost)
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      setFeedback('已复制 ✓', 'copy-btn--success', 2000);
      return;
    } catch {
      // fall through to execCommand fallback
    }
  }

  // Fallback for HTTP environments: execCommand is deprecated but still
  // widely supported and does not require a secure context
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    if (ok) {
      setFeedback('已复制 ✓', 'copy-btn--success', 2000);
    } else {
      setFeedback('复制失败，请手动选择', 'copy-btn--error', 3000);
    }
  } catch {
    setFeedback('复制失败，请手动选择', 'copy-btn--error', 3000);
  }
}

function setFeedback(text: string, cls: string, duration: number): void {
  if (feedbackTimer !== null) clearTimeout(feedbackTimer);
  label.value = text;
  feedbackClass.value = cls;
  isDisabled.value = true;
  feedbackTimer = setTimeout(() => {
    label.value = '复制';
    feedbackClass.value = '';
    isDisabled.value = false;
    feedbackTimer = null;
  }, duration);
}
</script>
