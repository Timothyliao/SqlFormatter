/**
 * SqlComplexity — scores a SQL string and maps it to an evolution level.
 */

export interface ComplexityScore {
  total: number;
  breakdown: {
    lines: number;
    joins: number;
    subqueries: number;
    ctes: number;
    windowFns: number;
    unions: number;
  };
}

export interface EvolutionLevel {
  level: number;
  emoji: string;
  name: string;
  tagline: string;
  minScore: number;
  maxScore: number;
  borderColor: string;
  glowColor: string;
}

export const EVOLUTION_LEVELS: EvolutionLevel[] = [
  { level: 1, emoji: '🦠', name: '原始汤',   tagline: '生命的起点',   minScore: 0,   maxScore: 10,       borderColor: '#6c7086', glowColor: 'transparent' },
  { level: 2, emoji: '🐛', name: '虫子',     tagline: '开始爬行了',   minScore: 11,  maxScore: 30,       borderColor: '#a6e3a1', glowColor: 'rgba(166,227,161,0.25)' },
  { level: 3, emoji: '🐟', name: '鱼',       tagline: '进入深水区',   minScore: 31,  maxScore: 60,       borderColor: '#89b4fa', glowColor: 'rgba(137,180,250,0.25)' },
  { level: 4, emoji: '🦎', name: '爬行动物', tagline: '上岸了',       minScore: 61,  maxScore: 100,      borderColor: '#fab387', glowColor: 'rgba(250,179,135,0.25)' },
  { level: 5, emoji: '🦕', name: '恐龙',     tagline: '统治者出现',   minScore: 101, maxScore: 150,      borderColor: '#cba6f7', glowColor: 'rgba(203,166,247,0.3)' },
  { level: 6, emoji: '🧠', name: '大脑',     tagline: '纯粹的智慧',   minScore: 151, maxScore: 200,      borderColor: '#f38ba8', glowColor: 'rgba(243,139,168,0.3)' },
  { level: 7, emoji: '👾', name: '未知生命', tagline: '超越人类理解', minScore: 201, maxScore: Infinity, borderColor: 'transparent', glowColor: 'transparent' },
];

export function scoreSql(sql: string): ComplexityScore {
  const upper = sql.toUpperCase();
  const lines = sql.split('\n').filter(l => l.trim()).length;
  const joins      = (upper.match(/\bJOIN\b/g) ?? []).length;
  const subqueries = (upper.match(/\(\s*SELECT\b/g) ?? []).length;
  const ctes       = (upper.match(/\bWITH\b/g) ?? []).length;
  const windowFns  = (upper.match(/\bOVER\s*\(/g) ?? []).length;
  const unions     = (upper.match(/\bUNION\b/g) ?? []).length;

  const total =
    lines * 1 +
    joins * 3 +
    subqueries * 5 +
    ctes * 4 +
    windowFns * 6 +
    unions * 3;

  return { total, breakdown: { lines, joins, subqueries, ctes, windowFns, unions } };
}

export function getLevel(score: ComplexityScore): EvolutionLevel {
  for (let i = EVOLUTION_LEVELS.length - 1; i >= 0; i--) {
    if (score.total >= EVOLUTION_LEVELS[i]!.minScore) {
      return EVOLUTION_LEVELS[i]!;
    }
  }
  return EVOLUTION_LEVELS[0]!;
}
