import type { Level, ProgressState, Word } from './types';
import { getWP } from './store';

export type Mode = 'all' | 'unknown' | 'difficult' | 'new';

export const MODE_LABELS: Record<Mode, string> = {
  all: 'Tous les mots',
  unknown: 'Non connus',
  difficult: 'Difficiles',
  new: 'Jamais vus',
};

export function pool(words: Word[], st: ProgressState, mode: Mode, level: Level | 'all' = 'all'): Word[] {
  const base = level === 'all' ? words : words.filter((w) => w.level === level);
  switch (mode) {
    case 'all': return base.slice();
    case 'unknown': return base.filter((w) => getWP(st, w.id).s !== 2);
    case 'difficult': return base.filter((w) => getWP(st, w.id).flag);
    case 'new': return base.filter((w) => getWP(st, w.id).s === 0);
  }
}

/**
 * File de tri rapide : les mots jamais vus (statut 0), dans l'ordre de la liste
 * officielle, filtrés par niveau, moins ceux passés pendant cette session.
 */
export function triagePool(
  words: Word[],
  st: ProgressState,
  level: Level | 'all',
  skipped: ReadonlySet<string>,
): Word[] {
  return words
    .filter((w) => (level === 'all' || w.level === level)
      && getWP(st, w.id).s === 0
      && !skipped.has(w.id))
    .sort((a, b) => a.ord - b.ord);
}

export interface DrawOpts {
  rng?: () => number;
  level?: Level | 'all';
}

/** Tirage aléatoire de n mots dans le pool du mode et du niveau (Fisher-Yates). */
export function draw(words: Word[], st: ProgressState, mode: Mode, n: number, opts: DrawOpts = {}): Word[] {
  const { rng = Math.random, level = 'all' } = opts;
  const p = pool(words, st, mode, level);
  for (let i = p.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  return p.slice(0, Math.max(0, n));
}
