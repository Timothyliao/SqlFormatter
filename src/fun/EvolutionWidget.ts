import { FunMode } from './FunMode';
import { scoreSql, getLevel, EVOLUTION_LEVELS } from './SqlComplexity';
import type { ComplexityScore, EvolutionLevel } from './SqlComplexity';

type SnapEdge = 'top' | 'bottom' | 'left' | 'right';

const STORAGE_POS_KEY = 'sql-formatter-evo-pos';
const WIDGET_SIZE = 56;

interface SavedPos { edge: SnapEdge; offset: number }

type QueueItem =
  | { type: 'terminal'; lines: Array<{ text: string; cls?: string }> }
  | { type: 'toast';    message: string; durationMs: number }
  | { type: 'tagline';  text: string };

/**
 * EvolutionWidget — draggable, edge-snapping creature widget.
 *
 * All visible messages (terminal bubble, toast, tagline) go through a
 * single FIFO queue so they never overlap.
 */
export class EvolutionWidget {
  private container: HTMLElement;
  private emojiEl: HTMLElement;
  private levelEl: HTMLElement;
  private tooltipEl: HTMLElement;
  private bookBtn: HTMLElement;

  private currentLevel = 0;
  private currentScore: ComplexityScore | null = null;

  // Message queue — ensures messages appear one at a time
  private queue: QueueItem[] = [];
  private queueBusy = false;

  // Drag state
  private snapEdge: SnapEdge = 'bottom';
  private snapOffset = 0;
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragOriginLeft = 0;
  private dragOriginTop = 0;

  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'evo-widget';
    this.container.setAttribute('aria-label', 'SQL 进化论');

    this.emojiEl = document.createElement('div');
    this.emojiEl.className = 'evo-emoji';
    this.emojiEl.textContent = '🦠';

    this.levelEl = document.createElement('div');
    this.levelEl.className = 'evo-level';
    this.levelEl.textContent = 'Lv.1';

    this.bookBtn = document.createElement('button');
    this.bookBtn.className = 'evo-book-btn';
    this.bookBtn.textContent = '✦';
    this.bookBtn.setAttribute('aria-label', '彩蛋图鉴');
    this.bookBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openEggBook();
    });

    this.tooltipEl = document.createElement('div');
    this.tooltipEl.className = 'evo-tooltip';

    this.container.appendChild(this.bookBtn);
    this.container.appendChild(this.emojiEl);
    this.container.appendChild(this.levelEl);
    this.container.appendChild(this.tooltipEl);

    this.container.addEventListener('mouseenter', () => this.showTooltip());
    this.container.addEventListener('mouseleave', () => this.hideTooltip());

    document.body.appendChild(this.container);

    this.initDrag();
    this.loadPosition();
    this.syncVisibility();
  }

  // ── Public API ────────────────────────────────────────────────────────────

  update(sql: string): void {
    if (!FunMode.isEnabled()) { this.syncVisibility(); return; }
    this.syncVisibility();

    const score = scoreSql(sql);
    const level = getLevel(score);
    this.currentScore = score;

    if (level.level !== this.currentLevel) {
      const isUpgrade = level.level > this.currentLevel;
      this.currentLevel = level.level;
      this.animateEvolutionEmoji(level, isUpgrade);
      if (isUpgrade) {
        this.enqueue({ type: 'tagline', text: `已进化为 ${level.name}！` });
      }
    }
    this.applyLevelStyle(level);
  }

  showToast(message: string, durationMs = 2500): void {
    if (!FunMode.isEnabled()) return;
    this.enqueue({ type: 'toast', message, durationMs });
  }

  showTerminal(lines: Array<{ text: string; cls?: string }>): void {
    if (!FunMode.isEnabled()) return;
    // Alert animation fires immediately, independent of queue
    this.emojiEl.classList.add('evo-alert');
    this.emojiEl.addEventListener('animationend', () => {
      this.emojiEl.classList.remove('evo-alert');
    }, { once: true });
    this.enqueue({ type: 'terminal', lines });
  }

  // ── Queue ─────────────────────────────────────────────────────────────────

  private enqueue(item: QueueItem): void {
    this.queue.push(item);
    if (!this.queueBusy) this.processNext();
  }

  private processNext(): void {
    if (this.queue.length === 0) { this.queueBusy = false; return; }
    this.queueBusy = true;
    const item = this.queue.shift()!;
    switch (item.type) {
      case 'terminal': this.playTerminal(item.lines); break;
      case 'toast':    this.playToast(item.message, item.durationMs); break;
      case 'tagline':  this.playTagline(item.text); break;
    }
  }

  /** Call this at the end of each play* method instead of processNext() directly. */
  private doneAndNext(): void {
    // 500ms gap between messages so the next one doesn't pop up instantly
    setTimeout(() => this.processNext(), 500);
  }

  private playTerminal(lines: Array<{ text: string; cls?: string }>): void {
    this.container.querySelector('.evo-bubble')?.remove();

    const bubble = document.createElement('div');
    // Direction matches snap edge — same as toast/tagline
    bubble.className = `evo-bubble evo-bubble--${this.snapEdge}`;

    const linesEl = document.createElement('div');
    linesEl.className = 'evo-bubble-lines';
    bubble.appendChild(linesEl);
    this.container.appendChild(bubble);

    requestAnimationFrame(() => bubble.classList.add('evo-bubble--visible'));

    let cumulativeDelay = 120;
    lines.forEach(({ text, cls }, idx) => {
      const rowDelay = cumulativeDelay;
      const typeDuration = Math.min(900, Math.max(300, text.length * 28));
      cumulativeDelay += typeDuration + 100;

      setTimeout(() => {
        const row = document.createElement('div');
        row.className = 'evo-bubble-row' + (cls ? ` ${cls}` : '');
        linesEl.appendChild(row);

        let i = 0;
        const speed = Math.floor(typeDuration / text.length) || 28;
        const timer = setInterval(() => {
          row.textContent = text.slice(0, i + 1);
          i++;
          if (i >= text.length) {
            clearInterval(timer);
            if (idx === lines.length - 1) {
              const cur = document.createElement('span');
              cur.className = 'evo-bubble-cursor';
              cur.textContent = '█';
              row.appendChild(cur);
            }
          }
        }, speed);
      }, rowDelay);
    });

    const totalDuration = cumulativeDelay + 1500;
    setTimeout(() => {
      bubble.classList.remove('evo-bubble--visible');
      setTimeout(() => { bubble.remove(); this.doneAndNext(); }, 400);
    }, totalDuration);
  }

  private playToast(message: string, durationMs: number): void {
    const toast = document.createElement('div');
    toast.className = 'evo-toast';
    toast.textContent = message;
    this.applyPopupDirection(toast);
    this.container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('evo-toast--visible'));
    setTimeout(() => {
      toast.classList.remove('evo-toast--visible');
      setTimeout(() => { toast.remove(); this.doneAndNext(); }, 400);
    }, durationMs);
  }

  private playTagline(text: string): void {
    const el = document.createElement('div');
    el.className = 'evo-tagline';
    el.textContent = text;
    this.applyPopupDirection(el);
    this.container.appendChild(el);
    requestAnimationFrame(() => el.classList.add('evo-tagline--visible'));
    setTimeout(() => {
      el.classList.remove('evo-tagline--visible');
      setTimeout(() => { el.remove(); this.doneAndNext(); }, 500);
    }, 2200);
  }

  /**
   * Position a popup element (toast / tagline) relative to the widget
   * so it always opens inward from the snapped edge, offset upward
   * to feel like a thought bubble.
   */
  private applyPopupDirection(el: HTMLElement): void {
    const sideGap = WIDGET_SIZE + 14; // 56px widget + 16px breathing room = 72px
    el.style.position = 'absolute';
    el.style.top = el.style.bottom = el.style.left = el.style.right = 'auto';
    el.style.transform = '';

    switch (this.snapEdge) {
      case 'right':
        el.style.right = `${sideGap}px`;
        el.style.top = '-8px';
        el.style.transform = 'translateX(8px)';
        break;
      case 'left':
        el.style.left = `${sideGap}px`;
        el.style.top = '-8px';
        el.style.transform = 'translateX(-8px)';
        break;
      case 'bottom':
        el.style.bottom = `${sideGap}px`;
        el.style.right = '0';
        el.style.transform = 'translateY(8px)';
        break;
      case 'top':
        el.style.top = `${sideGap}px`;
        el.style.right = '0';
        el.style.transform = 'translateY(-8px)';
        break;
    }
  }

  // ── Drag & snap ───────────────────────────────────────────────────────────

  private initDrag(): void {
    this.container.addEventListener('mousedown', (e) => {
      if ((e.target as HTMLElement).closest('button')) return;
      this.isDragging = true;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      const rect = this.container.getBoundingClientRect();
      this.dragOriginLeft = rect.left;
      this.dragOriginTop = rect.top;
      this.container.classList.add('evo-widget--dragging');
      this.container.style.transition = 'none';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.dragStartX;
      const dy = e.clientY - this.dragStartY;
      this.container.style.left   = `${this.dragOriginLeft + dx}px`;
      this.container.style.top    = `${this.dragOriginTop + dy}px`;
      this.container.style.right  = 'auto';
      this.container.style.bottom = 'auto';
    });

    document.addEventListener('mouseup', (e) => {
      if (!this.isDragging) return;
      this.isDragging = false;
      this.container.classList.remove('evo-widget--dragging');
      this.container.style.transition = '';
      const dx = e.clientX - this.dragStartX;
      const dy = e.clientY - this.dragStartY;
      this.snapToEdge(this.dragOriginLeft + dx, this.dragOriginTop + dy);
    });
  }

  private snapToEdge(left: number, top: number): void {
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

    this.snapEdge = edge;
    this.snapOffset = offset;
    this.applySnappedPosition();
    this.savePosition();
  }

  private applySnappedPosition(): void {
    const margin = 16;
    const s = this.container.style;
    s.left = s.right = s.top = s.bottom = 'auto';
    switch (this.snapEdge) {
      case 'right':  s.right  = `${margin}px`; s.top    = `${this.snapOffset}px`; break;
      case 'left':   s.left   = `${margin}px`; s.top    = `${this.snapOffset}px`; break;
      case 'bottom': s.bottom = `${margin}px`; s.left   = `${this.snapOffset}px`; break;
      case 'top':    s.top    = `${margin}px`; s.left   = `${this.snapOffset}px`; break;
    }
  }

  private savePosition(): void {
    try {
      localStorage.setItem(STORAGE_POS_KEY, JSON.stringify({ edge: this.snapEdge, offset: this.snapOffset }));
    } catch { /* ignore */ }
  }

  private loadPosition(): void {
    try {
      const raw = localStorage.getItem(STORAGE_POS_KEY);
      if (raw) {
        const pos: SavedPos = JSON.parse(raw);
        this.snapEdge = pos.edge;
        this.snapOffset = pos.offset;
      } else {
        this.snapEdge = 'bottom';
        this.snapOffset = window.innerWidth - WIDGET_SIZE - 24;
      }
    } catch {
      this.snapEdge = 'bottom';
      this.snapOffset = window.innerWidth - WIDGET_SIZE - 24;
    }
    this.applySnappedPosition();
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private syncVisibility(): void {
    this.container.style.display = FunMode.isEnabled() ? '' : 'none';
  }

  private applyLevelStyle(level: EvolutionLevel): void {
    this.emojiEl.textContent = level.emoji;
    this.levelEl.textContent = `Lv.${level.level}`;
    this.container.style.setProperty('--evo-border', level.borderColor);
    this.container.style.setProperty('--evo-glow', level.glowColor);
    this.container.classList.toggle('evo-widget--max', level.level === 7);
  }

  private animateEvolutionEmoji(level: EvolutionLevel, isUpgrade: boolean): void {
    const cls = isUpgrade ? 'evo-evolve' : 'evo-devolve';
    this.emojiEl.classList.add(cls);
    this.emojiEl.addEventListener('animationend', () => {
      this.emojiEl.classList.remove(cls);
      this.emojiEl.textContent = level.emoji;
    }, { once: true });
  }

  private showTooltip(): void {
    if (!this.currentScore || this.isDragging) return;
    const score = this.currentScore;
    const level = getLevel(score);
    const next = EVOLUTION_LEVELS.find(l => l.level === level.level + 1);
    const toNext = next ? next.minScore - score.total : 0;
    const pct = next
      ? Math.round(((score.total - level.minScore) / (next.minScore - level.minScore)) * 100)
      : 100;

    this.tooltipEl.innerHTML = `
      <div class="evo-tt-title">${level.emoji} ${level.name}</div>
      <div class="evo-tt-score">复杂度评分：${score.total}</div>
      <div class="evo-tt-bar"><div class="evo-tt-bar-fill" style="width:${pct}%"></div></div>
      <div class="evo-tt-next">${next ? `距下一级还差 ${toNext} 分` : '已达最高进化'}</div>
      <div class="evo-tt-breakdown">
        ${score.breakdown.joins > 0 ? `JOIN ×${score.breakdown.joins}` : ''}
        ${score.breakdown.ctes > 0 ? `CTE ×${score.breakdown.ctes}` : ''}
        ${score.breakdown.subqueries > 0 ? `子查询 ×${score.breakdown.subqueries}` : ''}
        ${score.breakdown.windowFns > 0 ? `窗口函数 ×${score.breakdown.windowFns}` : ''}
      </div>
    `;
    this.tooltipEl.className = `evo-tooltip evo-tooltip--${this.snapEdge} evo-tooltip--visible`;
  }

  private hideTooltip(): void {
    this.tooltipEl.classList.remove('evo-tooltip--visible');
  }

  private openEggBook(): void {
    document.dispatchEvent(new CustomEvent('open-egg-book'));
  }
}
