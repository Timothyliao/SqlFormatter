<template>
  <div ref="editorContainer" class="panel-body" style="height:100%;display:flex;flex-direction:column;" />
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { sql } from '@codemirror/lang-sql';
import { json } from '@codemirror/lang-json';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { bracketMatching, indentOnInput } from '@codemirror/language';
import { oneDark } from '@codemirror/theme-one-dark';
import { useFormatterStore } from '../stores/formatterStore';
import { useThemeStore } from '../stores/themeStore';
import type { AppTheme, FormatterMode } from '../types/index';

const editorContainer = ref<HTMLElement>();
const formatterStore = useFormatterStore();
const themeStore = useThemeStore();

const themeCompartment = new Compartment();
const langCompartment = new Compartment();
let view: EditorView | null = null;

// ── Theme definitions ─────────────────────────────────────────────────────────

const lightTheme = EditorView.theme(
  {
    '&': { backgroundColor: '#eff1f5', color: '#4c4f69' },
    '.cm-content': { caretColor: '#1e66f5' },
    '.cm-cursor': { borderLeftColor: '#1e66f5' },
    '.cm-gutters': { backgroundColor: '#e6e9ef', borderRight: '1px solid #ccd0da', color: '#8c8fa1' },
    '.cm-activeLineGutter': { backgroundColor: '#eff1f5' },
    '.cm-activeLine': { backgroundColor: 'rgba(30, 102, 245, 0.06)' },
    '.cm-matchingBracket': { backgroundColor: 'rgba(30, 102, 245, 0.2)', outline: '1px solid #1e66f5' },
    '.cm-selectionBackground, ::selection': { backgroundColor: 'rgba(30, 102, 245, 0.2)' },
    '.cm-keyword': { color: '#8839ef', fontWeight: '600' },
    '.cm-string': { color: '#40a02b' },
    '.cm-number': { color: '#fe640b' },
    '.cm-comment': { color: '#8c8fa1', fontStyle: 'italic' },
    '.cm-operator': { color: '#1e66f5' },
    '.cm-variableName': { color: '#04a5e5' },
  },
  { dark: false },
);

const darkThemeOverrides = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: 'var(--editor-font-size, 13px)',
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace",
  },
  '.cm-scroller': { overflow: 'auto', lineHeight: '1.6' },
  '.cm-content': { padding: '16px 0', caretColor: '#89b4fa' },
  '.cm-line': { padding: '0 16px' },
  '.cm-gutters': { backgroundColor: '#181825', borderRight: '1px solid #313244', color: '#6c7086' },
  '.cm-activeLineGutter': { backgroundColor: '#1e1e2e' },
  '.cm-activeLine': { backgroundColor: 'rgba(137, 180, 250, 0.06)' },
  '.cm-matchingBracket': { backgroundColor: 'rgba(137, 180, 250, 0.25)', outline: '1px solid #89b4fa' },
  '.cm-cursor': { borderLeftColor: '#89b4fa' },
});

const layoutTheme = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: 'var(--editor-font-size, 13px)',
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace",
  },
  '.cm-scroller': { overflow: 'auto', lineHeight: '1.6' },
  '.cm-content': { padding: '16px 0' },
  '.cm-line': { padding: '0 16px' },
});

function getThemeExtensions(theme: AppTheme) {
  return theme === 'light' ? [lightTheme] : [oneDark, darkThemeOverrides];
}

function getLangExtension(mode: FormatterMode) {
  return mode === 'json' ? json() : sql();
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(() => {
  if (!editorContainer.value) return;

  view = new EditorView({
    state: EditorState.create({
      doc: formatterStore.sql,
      extensions: [
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        indentOnInput(),
        bracketMatching(),
        langCompartment.of(getLangExtension(formatterStore.mode)),
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        layoutTheme,
        themeCompartment.of(getThemeExtensions(themeStore.theme)),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const val = update.state.doc.toString();
            if (val !== formatterStore.sql) {
              formatterStore.sql = val;
            }
          }
        }),
      ],
    }),
    parent: editorContainer.value,
  });

  const cmEl = editorContainer.value.querySelector('.cm-editor') as HTMLElement | null;
  if (cmEl) {
    cmEl.style.flex = '1';
    cmEl.style.minHeight = '0';
  }
});

onUnmounted(() => {
  view?.destroy();
  view = null;
});

// ── Watchers ──────────────────────────────────────────────────────────────────

// External sql write (history restore) → sync to editor
watch(
  () => formatterStore.sql,
  (val) => {
    if (!view) return;
    const current = view.state.doc.toString();
    if (val === current) return;
    view.dispatch({
      changes: { from: 0, to: current.length, insert: val },
    });
  },
);

// Theme hot-swap via Compartment
watch(
  () => themeStore.theme,
  (theme) => {
    view?.dispatch({
      effects: themeCompartment.reconfigure(getThemeExtensions(theme)),
    });
  },
);

// Language hot-swap via Compartment
watch(
  () => formatterStore.mode,
  (mode) => {
    view?.dispatch({
      effects: langCompartment.reconfigure(getLangExtension(mode)),
    });
  },
);
</script>
