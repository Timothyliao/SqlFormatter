import { FunMode } from './FunMode';

export interface EggDefinition {
  id: string;
  name: string;
  detect: (sql: string) => boolean;
  trigger: (ctx: EggContext) => void;
}

/** Minimal widget interface required by EasterEgg */
export interface IEvolutionWidget {
  showToast(message: string, durationMs?: number): void;
  showTerminal(lines: Array<{ text: string; cls?: string }>): void;
}

interface EggContext {
  widget: IEvolutionWidget;
}

const STORAGE_KEY = 'sql-formatter-eggbook';

function loadDiscovered(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

function saveDiscovered(ids: Set<string>): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids])); } catch { /* ignore */ }
}

function shakeScreen(): void {
  document.body.classList.add('egg-shake');
  setTimeout(() => document.body.classList.remove('egg-shake'), 600);
}

/**
 * Terminal-style full-screen overlay — REMOVED.
 * All dramatic effects now use widget.showTerminal() instead.
 */

function evaporatePreview(): void {
  const code = document.querySelector('.preview-code') as HTMLElement | null;
  if (!code) return;
  code.classList.add('egg-evaporate');
  setTimeout(() => code.classList.remove('egg-evaporate'), 1800);
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

export const EGG_DEFINITIONS: EggDefinition[] = [
  {
    id: 'nuclear',
    name: '核弹拦截',
    detect: sql => /\bDROP\s+TABLE\b/i.test(sql),
    trigger: ({ widget }) => {
      shakeScreen();
      widget.showTerminal([
        { text: '> CRITICAL ALERT DETECTED' },
        { text: '> OPERATION: DROP TABLE' },
        { text: '> INITIATING SELF-DESTRUCT...' },
        { text: '> [████████████████] 3s' },
        { text: '> INTERCEPTED ✓  DB SAVED', cls: 'evo-bubble-success' },
      ]);
    },
  },
  {
    id: 'delete-nuke',
    name: '差点删库跑路',
    detect: sql => /\bDELETE\s+FROM\b/i.test(sql) && !/\bWHERE\b/i.test(sql),
    trigger: ({ widget }) => {
      evaporatePreview();
      widget.showToast('😱 差点删库跑路，还好有我', 2500);
    },
  },
  {
    id: 'truncate',
    name: '清空宇宙',
    detect: sql => /\bTRUNCATE\b/i.test(sql),
    trigger: ({ widget }) => {
      widget.showTerminal([
        { text: '> TRUNCATE UNIVERSE INITIATED' },
        { text: '> DELETING ALL MATTER...' },
        { text: '> DELETING DARK MATTER...' },
        { text: '> ROWS AFFECTED: ∞', cls: 'evo-bubble-warn' },
        { text: '> REBUILDING FROM SCRATCH...', cls: 'evo-bubble-warn' },
      ]);
    },
  },
  {
    id: 'select-star',
    name: '全表扫描侦探',
    detect: sql => /SELECT\s+\*/i.test(sql),
    trigger: ({ widget }) => { widget.showToast('🤔 真的需要所有列吗？', 2000); },
  },
  {
    id: 'select-one',
    name: '宇宙答案',
    detect: sql => /^\s*SELECT\s+1\s*;?\s*$/i.test(sql.trim()),
    trigger: ({ widget }) => {
      const code = document.querySelector('.preview-code code') as HTMLElement | null;
      if (code) {
        const orig = code.innerHTML;
        code.textContent = '42';
        setTimeout(() => { code.innerHTML = orig; }, 900);
      }
      widget.showToast('🌌 宇宙的答案是 42', 2500);
    },
  },
  {
    id: 'select-null',
    name: '虚无哲学家',
    detect: sql => /^\s*SELECT\s+NULL\s*;?\s*$/i.test(sql.trim()),
    trigger: ({ widget }) => {
      widget.showTerminal([
        { text: '> QUERYING THE VOID...' },
        { text: '> RESULT: NULL' },
        { text: '> MEANING: NULL' },
        { text: '> EXISTENCE: NULL' },
        { text: '> 虚无即是答案', cls: 'evo-bubble-dim' },
      ]);
    },
  },
  {
    id: 'semicolon-only',
    name: '极简主义者',
    detect: sql => /^\s*;\s*$/.test(sql.trim()),
    trigger: ({ widget }) => { widget.showToast('🙏 史上最简洁的 SQL，大道至简', 2500); },
  },
  {
    id: 'epic-query',
    name: '史诗级查询',
    detect: sql => sql.split('\n').length >= 500,
    trigger: ({ widget }) => {
      confetti();
      widget.showToast('🏆 史诗级查询，你还好吗？', 3000);
    },
  },
];

export class EasterEgg {
  private discovered: Set<string>;
  private lastTriggered: Map<string, number> = new Map();
  private readonly COOLDOWN_MS = 8000;

  constructor(private widget: IEvolutionWidget) {
    this.discovered = loadDiscovered();
  }

  check(sql: string): void {
    if (!FunMode.isEnabled()) return;
    const now = Date.now();
    const ctx: EggContext = { widget: this.widget };
    for (const egg of EGG_DEFINITIONS) {
      if (now - (this.lastTriggered.get(egg.id) ?? 0) < this.COOLDOWN_MS) continue;
      if (egg.detect(sql)) {
        egg.trigger(ctx);
        this.lastTriggered.set(egg.id, now);
        if (!this.discovered.has(egg.id)) {
          this.discovered.add(egg.id);
          saveDiscovered(this.discovered);
          document.dispatchEvent(new CustomEvent('egg-discovered', { detail: egg.id }));
        }
        break;
      }
    }
  }

  getDiscovered(): Set<string> { return this.discovered; }
}
