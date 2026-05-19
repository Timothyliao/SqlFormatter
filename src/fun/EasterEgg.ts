import { FunMode } from './FunMode';

export interface EggDefinition {
  id: string;
  name: string;
  trigger: (ctx: EggContext) => void;
}

export interface IEvolutionWidget {
  showToast(message: string, durationMs?: number): void;
  showTerminal(lines: Array<{ text: string; cls?: string }>): void;
  showAlert(durationMs?: number): void;
  showTagline(text: string): void;
  showConfetti(): void;
}

export interface EggContext {
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

export const EGG_DEFINITIONS: EggDefinition[] = [
  {
    id: 'first-contact',
    name: '第一次接触',
    trigger: ({ widget }) => {
      widget.showTagline('文明的第一步');
    },
  },
  {
    id: 'reset',
    name: '归零重启',
    trigger: ({ widget }) => {
      widget.showToast('🌌 归零，宇宙重新开始', 2500);
    },
  },
  {
    id: 'void',
    name: '虚空凝视',
    trigger: ({ widget }) => {
      widget.showTerminal([
        { text: '> SCANNING INPUT...' },
        { text: '> INPUT: NULL' },
        { text: '> STARING INTO THE VOID...' },
        { text: '> THE VOID STARES BACK', cls: 'evo-bubble-warn' },
        { text: '> 也许空白本身就是答案', cls: 'evo-bubble-dim' },
      ]);
    },
  },
  {
    id: 'time-traveler',
    name: '时间旅行者',
    trigger: ({ widget }) => {
      widget.showToast('⏳ 在时间线上徘徊', 2500);
    },
  },
  {
    id: 'light-seeker',
    name: '寻光者',
    trigger: ({ widget }) => {
      widget.showToast('💡 还没找到合适的光线', 2000);
    },
  },
  {
    id: 'multiverse',
    name: '多元宇宙',
    trigger: ({ widget }) => {
      widget.showTerminal([
        { text: '> 检测到 5 条平行时间线' },
        { text: '> 多元宇宙理论已验证', cls: 'evo-bubble-success' },
        { text: '> 请问哪个才是主宇宙？', cls: 'evo-bubble-dim' },
      ]);
    },
  },
  {
    id: 'deep-focus',
    name: '深度工作者',
    trigger: ({ widget }) => {
      widget.showTerminal([
        { text: '> 专注时长：30 分钟' },
        { text: '> 进入深度工作状态', cls: 'evo-bubble-success' },
        { text: '> 外部干扰已屏蔽' },
        { text: '> 文明在专注中诞生', cls: 'evo-bubble-dim' },
      ]);
    },
  },
  {
    id: 'marathon',
    name: '马拉松',
    trigger: ({ widget }) => {
      widget.showConfetti();
      widget.showTerminal([
        { text: '> 累计使用：60 分钟' },
        { text: '> 你已完成一次文明长征', cls: 'evo-bubble-success' },
        { text: '> 休息一下，宇宙不会跑掉', cls: 'evo-bubble-dim' },
      ]);
    },
  },
];

// 扩展 widget 接口，增加 showTagline / showConfetti

export class EasterEgg {
  private discovered: Set<string>;
  private readonly COOLDOWN_MS = 10000;
  private lastTriggered: Map<string, number> = new Map();

  constructor(private widget: IEvolutionWidget) {
    this.discovered = loadDiscovered();
  }

  trigger(id: string): void {
    if (!FunMode.isEnabled()) return;
    const egg = EGG_DEFINITIONS.find(e => e.id === id);
    if (!egg) return;
    const now = Date.now();
    if (now - (this.lastTriggered.get(id) ?? 0) < this.COOLDOWN_MS) return;
    this.lastTriggered.set(id, now);
    egg.trigger({ widget: this.widget });
    if (!this.discovered.has(id)) {
      this.discovered.add(id);
      saveDiscovered(this.discovered);
      document.dispatchEvent(new CustomEvent('egg-discovered', { detail: id }));
    }
  }

  isFirstVisit(): boolean {
    return this.discovered.size === 0;
  }

  getDiscovered(): Set<string> { return this.discovered; }
}
