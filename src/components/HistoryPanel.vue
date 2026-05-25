<template>
  <div class="doc-tab-list" role="tablist" aria-label="SQL 文档">
    <div
      v-for="doc in historyStore.docs"
      :key="doc.id"
      class="doc-tab"
      :class="{ 'is-active': doc.id === historyStore.activeId }"
      role="tab"
      :aria-selected="doc.id === historyStore.activeId"
      :data-id="doc.id"
      @click="handleTabClick(doc.id)"
    >
      <!-- Label or rename input -->
      <span
        v-if="renamingId !== doc.id"
        class="doc-tab-label"
        title="双击重命名"
        @dblclick.stop="startRename(doc.id, doc.label)"
      >
        {{ doc.label }}
        <span
          v-if="historyStore.dirtyId === doc.id"
          class="doc-tab-dirty"
          title="有未保存的修改"
          aria-label="未保存"
        />
      </span>
      <input
        v-else
        ref="renameInputRef"
        v-model="renameValue"
        class="doc-tab-rename-input"
        type="text"
        maxlength="30"
        aria-label="重命名文档"
        @blur="commitRename(doc.id)"
        @keydown.enter.prevent="commitRename(doc.id)"
        @keydown.esc="renamingId = null"
        @click.stop
      />

      <!-- Action buttons -->
      <div class="doc-tab-actions">
        <button
          class="doc-tab-action-btn doc-tab-rename"
          title="重命名"
          aria-label="重命名文档"
          @click.stop="startRename(doc.id, doc.label)"
        >
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Z" fill="currentColor"/>
          </svg>
        </button>
        <button
          class="doc-tab-action-btn doc-tab-delete"
          :title="historyStore.docs.length === 1 ? '至少保留一个文档' : '删除文档'"
          aria-label="删除文档"
          :disabled="historyStore.docs.length === 1"
          @click.stop="handleDeleteDoc(doc.id)"
        >
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" fill="currentColor"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- New document button -->
    <button
      v-if="historyStore.docs.length < MAX_DOCUMENTS"
      class="doc-new-btn"
      title="新建文档"
      aria-label="新建文档"
      @click="handleNewDocument"
    >
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2Z" fill="currentColor"/>
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue';
import { useHistoryStore } from '../stores/historyStore';
import { useFormatterStore } from '../stores/formatterStore';
import { MAX_DOCUMENTS } from '../types/index';

const historyStore = useHistoryStore();
const formatterStore = useFormatterStore();

const renamingId = ref<string | null>(null);
const renameValue = ref('');
const renameInputRef = ref<HTMLInputElement | null>(null);

function handleTabClick(id: string): void {
  if (id === historyStore.activeId) return;
  // Save current format target to the document we're leaving
  historyStore.saveFormatTarget(formatterStore.formatTarget);
  // flushFn: save current editor content before switching
  const newSql = historyStore.switchTo(id, () => {
    historyStore.saveActiveDoc(formatterStore.sql);
  });
  if (newSql !== null) {
    formatterStore.isRestoringFromHistory = true;
    formatterStore.sql = newSql;
    // Restore per-document format target
    const doc = historyStore.getActiveDoc();
    if (doc?.formatTarget) {
      formatterStore.setFormatTarget(doc.formatTarget);
    }
    setTimeout(() => {
      formatterStore.isRestoringFromHistory = false;
    }, 0);
  }
}

function startRename(id: string, currentLabel: string): void {
  renamingId.value = id;
  renameValue.value = currentLabel;
  nextTick(() => {
    renameInputRef.value?.focus();
    renameInputRef.value?.select();
  });
}

function handleNewDocument(): void {
  // Save current format target before creating new doc
  historyStore.saveFormatTarget(formatterStore.formatTarget);
  historyStore.newDocument();
  // New document inherits current format target
  historyStore.saveFormatTarget(formatterStore.formatTarget);
  formatterStore.isRestoringFromHistory = true;
  formatterStore.sql = '';
  setTimeout(() => {
    formatterStore.isRestoringFromHistory = false;
  }, 0);
}

function handleDeleteDoc(id: string): void {
  const newSql = historyStore.deleteDoc(id);
  if (newSql !== null) {
    formatterStore.isRestoringFromHistory = true;
    formatterStore.sql = newSql;
    // Restore per-document format target
    const doc = historyStore.getActiveDoc();
    if (doc?.formatTarget) {
      formatterStore.setFormatTarget(doc.formatTarget);
    }
    setTimeout(() => {
      formatterStore.isRestoringFromHistory = false;
    }, 0);
  }
}

function commitRename(id: string): void {
  const label = renameValue.value.trim();
  if (label) {
    historyStore.renameDoc(id, label);
  }
  renamingId.value = null;
}
</script>
