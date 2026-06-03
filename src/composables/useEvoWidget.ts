import { ref, onMounted, onUnmounted } from 'vue';

type SnapEdge = 'top' | 'bottom' | 'left' | 'right';

const STORAGE_POS_KEY = 'sql-formatter-evo-pos';
const WIDGET_SIZE = 56;

interface SavedPos { edge: SnapEdge; offset: number }

export function useEvoWidget(containerRef: { value: HTMLElement | null }) {
  const snapEdge = ref<SnapEdge>('bottom');
  const snapOffset = ref(0);
  const isDragging = ref(false);

  let dragStartX = 0;
  let dragStartY = 0;
  let dragOriginLeft = 0;
  let dragOriginTop = 0;

  function applySnappedPosition(): void {
    const el = containerRef.value;
    if (!el) return;
    const margin = 16;
    el.style.left = el.style.right = el.style.top = el.style.bottom = 'auto';
    switch (snapEdge.value) {
      case 'right':  el.style.right  = `${margin}px`; el.style.top    = `${snapOffset.value}px`; break;
      case 'left':   el.style.left   = `${margin}px`; el.style.top    = `${snapOffset.value}px`; break;
      case 'bottom': el.style.bottom = `${margin}px`; el.style.left   = `${snapOffset.value}px`; break;
      case 'top':    el.style.top    = `${margin}px`; el.style.left   = `${snapOffset.value}px`; break;
    }
  }

  function snapToEdge(left: number, top: number): void {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cx = left + WIDGET_SIZE / 2;
    const cy = top + WIDGET_SIZE / 2;
    const margin = 16;

    const dists: [SnapEdge, number][] = [
      ['left',   cx],
      ['right',  vw - cx],
      ['top',    cy],
      ['bottom', vh - cy],
    ];
    const [edge] = dists.reduce((a, b) => a[1] < b[1] ? a : b);

    let offset: number;
    if (edge === 'left' || edge === 'right') {
      offset = Math.max(margin, Math.min(vh - WIDGET_SIZE - margin, top));
    } else {
      offset = Math.max(margin, Math.min(vw - WIDGET_SIZE - margin, left));
    }

    snapEdge.value = edge;
    snapOffset.value = offset;
    applySnappedPosition();
    savePosition();
  }

  function savePosition(): void {
    try {
      localStorage.setItem(STORAGE_POS_KEY, JSON.stringify({ edge: snapEdge.value, offset: snapOffset.value }));
    } catch { /* ignore */ }
  }

  function loadPosition(): void {
    try {
      const raw = localStorage.getItem(STORAGE_POS_KEY);
      if (raw) {
        const pos: SavedPos = JSON.parse(raw);
        snapEdge.value = pos.edge;
        snapOffset.value = pos.offset;
      } else {
        snapEdge.value = 'bottom';
        snapOffset.value = window.innerWidth - WIDGET_SIZE - 24;
      }
    } catch {
      snapEdge.value = 'bottom';
      snapOffset.value = window.innerWidth - WIDGET_SIZE - 24;
    }
    applySnappedPosition();
  }

  function getPoint(e: MouseEvent | TouchEvent): { x: number; y: number } {
    if ('touches' in e) {
      const t = e.touches[0] ?? e.changedTouches[0];
      return { x: t.clientX, y: t.clientY };
    }
    return { x: e.clientX, y: e.clientY };
  }

  function onDragStart(e: MouseEvent | TouchEvent): void {
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    const el = containerRef.value;
    if (!el) return;
    const p = getPoint(e);
    isDragging.value = true;
    dragStartX = p.x;
    dragStartY = p.y;
    const rect = el.getBoundingClientRect();
    dragOriginLeft = rect.left;
    dragOriginTop = rect.top;
    el.classList.add('evo-widget--dragging');
    el.style.transition = 'none';
    e.preventDefault();
  }

  function onDragMove(e: MouseEvent | TouchEvent): void {
    if (!isDragging.value) return;
    const el = containerRef.value;
    if (!el) return;
    e.preventDefault();
    const p = getPoint(e);
    const dx = p.x - dragStartX;
    const dy = p.y - dragStartY;
    el.style.left   = `${dragOriginLeft + dx}px`;
    el.style.top    = `${dragOriginTop + dy}px`;
    el.style.right  = 'auto';
    el.style.bottom = 'auto';
  }

  function onDragEnd(e: MouseEvent | TouchEvent): void {
    if (!isDragging.value) return;
    const el = containerRef.value;
    if (!el) return;
    isDragging.value = false;
    el.classList.remove('evo-widget--dragging');
    el.style.transition = '';
    const p = getPoint(e);
    snapToEdge(dragOriginLeft + (p.x - dragStartX), dragOriginTop + (p.y - dragStartY));
  }

  function initDrag(): void {
    const el = containerRef.value;
    if (!el) return;
    el.addEventListener('mousedown', onDragStart);
    el.addEventListener('touchstart', onDragStart, { passive: false });
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('touchmove', onDragMove, { passive: false });
    document.addEventListener('mouseup', onDragEnd);
    document.addEventListener('touchend', onDragEnd);
  }

  function destroyDrag(): void {
    const el = containerRef.value;
    if (el) {
      el.removeEventListener('mousedown', onDragStart);
      el.removeEventListener('touchstart', onDragStart);
    }
    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('touchmove', onDragMove);
    document.removeEventListener('mouseup', onDragEnd);
    document.removeEventListener('touchend', onDragEnd);
  }

  onMounted(() => {
    loadPosition();
    initDrag();
  });

  onUnmounted(() => {
    destroyDrag();
  });

  return { snapEdge, snapOffset, isDragging, applySnappedPosition };
}
