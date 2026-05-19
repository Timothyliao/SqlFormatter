/**
 * ActivityScore — 基于用户行为的生命体评分系统。
 * 与输入内容的语义完全解耦，反映用户的专注度和活跃程度。
 */

export type EraState = 'dormant' | 'stable' | 'chaotic' | 'reviving';

export interface ActivityScore {
  total: number;
  breakdown: {
    edits: number;
    focusMinutes: number;
    diversity: number;
    contentTier: number; // 0–3
  };
}

export interface EvolutionLevel {
  level: number;
  emoji: string;
  name: string;
  tagline: string;
  minScore: number;
  borderColor: string;
  glowColor: string;
}

export const EVOLUTION_LEVELS: EvolutionLevel[] = [
  { level: 1, emoji: '🌑', name: '黑暗纪元',   tagline: '一切尚未开始',     minScore: 0,   borderColor: '#6c7086', glowColor: 'transparent' },
  { level: 2, emoji: '🔥', name: '恒纪元初期', tagline: '文明的火种点燃',   minScore: 10,  borderColor: '#fab387', glowColor: 'rgba(250,179,135,0.25)' },
  { level: 3, emoji: '🌊', name: '乱纪元',     tagline: '混沌中孕育秩序',   minScore: 30,  borderColor: '#89b4fa', glowColor: 'rgba(137,180,250,0.25)' },
  { level: 4, emoji: '🏗️', name: '文明建设期', tagline: '专注创造一切',     minScore: 60,  borderColor: '#a6e3a1', glowColor: 'rgba(166,227,161,0.25)' },
  { level: 5, emoji: '🛸', name: '技术爆炸',   tagline: '超越已知的边界',   minScore: 100, borderColor: '#cba6f7', glowColor: 'rgba(203,166,247,0.3)' },
  { level: 6, emoji: '🌌', name: '宇宙社会学', tagline: '黑暗森林法则显现', minScore: 150, borderColor: '#f38ba8', glowColor: 'rgba(243,139,168,0.3)' },
  { level: 7, emoji: '☀️', name: '二向箔展开', tagline: '维度归零',         minScore: 200, borderColor: 'transparent', glowColor: 'transparent' },
];

/** 内容体量分档（字符数 → 0–3） */
function contentTier(len: number): number {
  if (len >= 2000) return 3;
  if (len >= 500)  return 2;
  if (len >= 100)  return 1;
  return 0;
}

export function calcScore(
  edits: number,
  focusMinutes: number,
  diversity: number,
  contentLen: number,
): ActivityScore {
  const tier = contentTier(contentLen);
  const total = edits * 1 + focusMinutes * 5 + diversity * 10 + tier * 3;
  return { total, breakdown: { edits, focusMinutes, diversity, contentTier: tier } };
}

export function getLevel(score: ActivityScore): EvolutionLevel {
  for (let i = EVOLUTION_LEVELS.length - 1; i >= 0; i--) {
    if (score.total >= EVOLUTION_LEVELS[i]!.minScore) return EVOLUTION_LEVELS[i]!;
  }
  return EVOLUTION_LEVELS[0]!;
}

/** 根据最近 N 次内容长度的标准差判断纪元 */
export function calcEra(recentLengths: number[]): 'stable' | 'chaotic' {
  if (recentLengths.length < 3) return 'stable';
  const mean = recentLengths.reduce((a, b) => a + b, 0) / recentLengths.length;
  const variance = recentLengths.reduce((a, b) => a + (b - mean) ** 2, 0) / recentLengths.length;
  return Math.sqrt(variance) > 200 ? 'chaotic' : 'stable';
}
